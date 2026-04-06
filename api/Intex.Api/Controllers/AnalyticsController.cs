using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public sealed class AnalyticsController(AppDbContext db) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult> GetOverview()
    {
        var nowUtc = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(nowUtc);

        var donationsCutoff = today.AddDays(-30);
        var recordingsCutoff = today.AddDays(-7);
        var checkinCutoff = today.AddDays(-30);

        var activeResidents = await db.Residents.AsNoTracking()
            .CountAsync(x => x.CaseStatus == "Active");

        var donation30d = await db.Contributions.AsNoTracking()
            .Where(x => x.ContributionType == "Monetary" && x.ContributionDate >= donationsCutoff)
            .GroupBy(_ => 1)
            .Select(g => new { count = g.Count(), totalAmount = g.Sum(x => x.Amount) })
            .FirstOrDefaultAsync();

        var processRecordings7d = await db.ProcessRecordings.AsNoTracking()
            .CountAsync(x => x.SessionDate >= recordingsCutoff);

        var upcomingConferences14d = await db.CaseConferences.AsNoTracking()
            .CountAsync(x => !x.IsCompleted && x.ScheduledAtUtc >= nowUtc && x.ScheduledAtUtc <= nowUtc.AddDays(14));

        var lastVisitByResident = db.HomeVisitations.AsNoTracking()
            .GroupBy(x => x.ResidentId)
            .Select(g => new { ResidentId = g.Key, LastVisitDate = (DateOnly?)g.Max(v => v.VisitDate) });

        var checkInsDue30d = await db.Residents.AsNoTracking()
            .Where(x => x.CaseStatus == "Active")
            .GroupJoin(
                lastVisitByResident,
                r => r.ResidentId,
                v => v.ResidentId,
                (r, v) => new { last = v.Select(x => x.LastVisitDate).FirstOrDefault() }
            )
            .CountAsync(x => x.last == null || x.last < checkinCutoff);

        var donorLapse = await GetCurrentBandCountsAsync("donor_lapse_90d", "Supporter");
        var residentRisk = await GetCurrentBandCountsAsync("resident_incident_30d", "Resident");

        return Ok(new
        {
            asOfUtc = nowUtc,
            activeResidents,
            donations30d = new
            {
                count = donation30d?.count ?? 0,
                totalAmount = donation30d?.totalAmount ?? 0m
            },
            processRecordings7d,
            upcomingConferences14d,
            checkInsDue30d,
            donorLapse,
            residentRisk
        });
    }

    [HttpGet("ops-alerts")]
    public async Task<ActionResult> GetOpsAlerts([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var checkinCutoff = today.AddDays(-30);
        var counselingCutoff = today.AddDays(-14);

        var lastVisitByResident = db.HomeVisitations.AsNoTracking()
            .GroupBy(x => x.ResidentId)
            .Select(g => new { ResidentId = g.Key, LastVisitDate = (DateOnly?)g.Max(v => v.VisitDate) });

        var lastRecordingByResident = db.ProcessRecordings.AsNoTracking()
            .GroupBy(x => x.ResidentId)
            .Select(g => new { ResidentId = g.Key, LastSessionDate = (DateOnly?)g.Max(v => v.SessionDate) });

        var latestRiskCreatedAt = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == "resident_incident_30d" && x.EntityType == "Resident")
            .MaxAsync(x => (DateTime?)x.CreatedAtUtc);

        var currentRiskByResident = db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == "resident_incident_30d" && x.EntityType == "Resident")
            .Where(x => latestRiskCreatedAt != null && x.CreatedAtUtc == latestRiskCreatedAt)
            .Select(x => new { x.EntityId, x.Score, x.Label });

        var items = await db.Residents.AsNoTracking()
            .Where(x => x.CaseStatus == "Active")
            .GroupJoin(
                lastVisitByResident,
                r => r.ResidentId,
                v => v.ResidentId,
                (r, v) => new { r, lastVisit = v.Select(x => x.LastVisitDate).FirstOrDefault() }
            )
            .GroupJoin(
                lastRecordingByResident,
                x => x.r.ResidentId,
                p => p.ResidentId,
                (x, p) => new { x.r, x.lastVisit, lastSession = p.Select(y => y.LastSessionDate).FirstOrDefault() }
            )
            .GroupJoin(
                currentRiskByResident,
                x => x.r.ResidentId,
                p => p.EntityId,
                (x, p) => new
                {
                    x.r.ResidentId,
                    x.r.DisplayName,
                    x.r.SafehouseId,
                    x.r.AssignedSocialWorker,
                    x.lastVisit,
                    x.lastSession,
                    riskScore = p.Select(y => (decimal?)y.Score).FirstOrDefault(),
                    riskBand = p.Select(y => y.Label).FirstOrDefault()
                }
            )
            .ToListAsync();

        var alerts = items
            .Select(x =>
            {
                var reasons = new List<string>();
                if (x.lastVisit == null || x.lastVisit < checkinCutoff) reasons.Add("Home/field check-in due");
                if (x.lastSession == null || x.lastSession < counselingCutoff) reasons.Add("Counseling session note overdue");
                if (string.Equals(x.riskBand, "High", StringComparison.OrdinalIgnoreCase)) reasons.Add("High incident risk (30d)");
                return new
                {
                    x.ResidentId,
                    x.DisplayName,
                    x.SafehouseId,
                    x.AssignedSocialWorker,
                    lastHomeVisitDate = x.lastVisit,
                    lastProcessRecordingDate = x.lastSession,
                    x.riskScore,
                    x.riskBand,
                    reasons
                };
            })
            .Where(x => x.reasons.Count > 0)
            .OrderByDescending(x => x.reasons.Contains("High incident risk (30d)"))
            .ThenBy(x => x.lastHomeVisitDate ?? DateOnly.MinValue)
            .ThenBy(x => x.lastProcessRecordingDate ?? DateOnly.MinValue)
            .Take(take)
            .ToList();

        return Ok(new { asOfUtc = DateTime.UtcNow, items = alerts });
    }

    private async Task<object> GetCurrentBandCountsAsync(string predictionType, string entityType)
    {
        var latestCreatedAt = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == predictionType && x.EntityType == entityType)
            .MaxAsync(x => (DateTime?)x.CreatedAtUtc);

        if (latestCreatedAt == null) return new { predictionType, entityType, asOfUtc = (DateTime?)null, byBand = Array.Empty<object>() };

        var byBand = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == predictionType && x.EntityType == entityType && x.CreatedAtUtc == latestCreatedAt)
            .GroupBy(x => x.Label ?? "Unlabeled")
            .Select(g => new { band = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return new { predictionType, entityType, asOfUtc = latestCreatedAt, byBand };
    }
}

