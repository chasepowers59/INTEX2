using Intex.Api.Auth;
using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize(Policy = AppPolicies.StaffOnly)]
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
            .Select(g => new { count = g.Count(), totalAmount = g.Sum(x => x.Amount ?? 0m) })
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

    /// <summary>
    /// Cross-domain insights from Lighthouse tables: program pillars (AAR-style), allocations, education/health, incidents, social ROI.
    /// </summary>
    [HttpGet("program-insights")]
    public async Task<ActionResult> GetProgramInsights()
    {
        var nowUtc = DateTime.UtcNow;
        var incidentFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90));

        var interventionByStatus = await db.InterventionPlans.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var serviceTexts = await db.InterventionPlans.AsNoTracking()
            .Where(x => x.ServicesProvided != null && x.ServicesProvided != "")
            .Select(x => x.ServicesProvided!)
            .ToListAsync();

        var caring = 0;
        var healing = 0;
        var teaching = 0;
        var legal = 0;
        foreach (var s in serviceTexts)
        {
            var t = s.ToLowerInvariant();
            if (t.Contains("caring")) caring++;
            if (t.Contains("healing")) healing++;
            if (t.Contains("teaching")) teaching++;
            if (t.Contains("legal")) legal++;
        }

        var donationAllocationsByProgram = await db.DonationAllocations.AsNoTracking()
            .GroupBy(x => x.ProgramArea)
            .Select(g => new { programArea = g.Key, totalPhp = g.Sum(x => x.AmountAllocated) })
            .OrderByDescending(x => x.totalPhp)
            .ToListAsync();

        var eduForAvg = db.EducationRecords.AsNoTracking().Where(x => x.ProgressPercent.HasValue);
        var eduAvg = await eduForAvg.AnyAsync()
            ? await eduForAvg.AverageAsync(x => x.ProgressPercent!.Value)
            : (decimal?)null;

        var eduCompleted = await db.EducationRecords.AsNoTracking()
            .CountAsync(x => x.CompletionStatus == "Completed");

        var healthForAvg = db.HealthWellbeingRecords.AsNoTracking().Where(x => x.GeneralHealthScore.HasValue);
        var healthAvg = await healthForAvg.AnyAsync()
            ? await healthForAvg.AverageAsync(x => x.GeneralHealthScore!.Value)
            : (decimal?)null;

        var incidentsByType = await db.IncidentReports.AsNoTracking()
            .Where(x => x.IncidentDate >= incidentFrom)
            .GroupBy(x => x.IncidentType)
            .Select(g => new { incidentType = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var openIncidents = await db.IncidentReports.AsNoTracking()
            .CountAsync(x => !x.Resolved && x.FollowUpRequired);

        var boostSpendPhp = await db.SocialMediaPosts.AsNoTracking()
            .SumAsync(x => x.BoostBudgetPhp ?? 0m);

        var socialEstimatedValuePhp = await db.SocialMediaPosts.AsNoTracking()
            .SumAsync(x => x.EstimatedDonationValuePhp ?? 0m);

        var topReferralPosts = await db.SocialMediaPosts.AsNoTracking()
            .Where(x => (x.DonationReferrals ?? 0) > 0 || (x.EstimatedDonationValuePhp ?? 0m) > 0)
            .OrderByDescending(x => x.EstimatedDonationValuePhp ?? 0m)
            .ThenByDescending(x => x.DonationReferrals ?? 0)
            .Take(5)
            .Select(x => new
            {
                x.PostId,
                x.Platform,
                x.PostType,
                x.CampaignName,
                referrals = x.DonationReferrals ?? 0,
                estimatedValuePhp = x.EstimatedDonationValuePhp ?? 0m,
                x.IsBoosted,
                boostPhp = x.BoostBudgetPhp ?? 0m
            })
            .ToListAsync();

        var contributionMix = await db.Contributions.AsNoTracking()
            .GroupBy(x => x.ContributionType)
            .Select(g => new { type = g.Key, count = g.Count(), monetaryPhp = g.Sum(x => x.Amount ?? 0m) })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return Ok(new
        {
            asOfUtc = nowUtc,
            interventionByStatus,
            servicesPillarMentions = new { caring, healing, teaching, legal, plansWithServicesText = serviceTexts.Count },
            donationAllocationsByProgram,
            education = new
            {
                avgProgressPercent = eduAvg.HasValue ? Math.Round((double)eduAvg.Value, 1) : (double?)null,
                recordsCompleted = eduCompleted
            },
            health = new
            {
                avgGeneralHealthScore = healthAvg.HasValue ? Math.Round((double)healthAvg.Value, 2) : (double?)null
            },
            incidents90d = new
            {
                from = incidentFrom,
                byType = incidentsByType,
                openFollowUps = openIncidents
            },
            socialRoi = new
            {
                totalBoostSpendPhp = boostSpendPhp,
                totalEstimatedDonationValuePhp = socialEstimatedValuePhp,
                topPosts = topReferralPosts
            },
            contributionMix
        });
    }
}

