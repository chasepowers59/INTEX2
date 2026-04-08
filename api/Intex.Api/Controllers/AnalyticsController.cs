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
    private static readonly IReadOnlyDictionary<string, (string outcome, decimal unitPhp)> OutcomeMap =
        new Dictionary<string, (string outcome, decimal unitPhp)>(StringComparer.OrdinalIgnoreCase)
        {
            ["Counseling"] = ("trauma-informed counseling session", 1200m),
            ["Education"] = ("week of learning support", 900m),
            ["Health"] = ("health and wellbeing check", 700m),
            ["Shelter"] = ("day of safe shelter", 1500m),
            ["Food"] = ("nutritional support pack", 450m),
            ["Transport"] = ("safe transport support", 300m)
        };

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
        try
        {
            // Keep each query simple to avoid provider translation edge-cases.
            var residents = await db.Residents.AsNoTracking()
                .Where(x => x.CaseStatus == "Active")
                .Select(x => new
                {
                    x.ResidentId,
                    x.DisplayName,
                    x.SafehouseId,
                    x.AssignedSocialWorker
                })
                .ToListAsync();

            var lastVisitByResident = await db.HomeVisitations.AsNoTracking()
                .GroupBy(x => x.ResidentId)
                .Select(g => new { ResidentId = g.Key, LastVisitDate = (DateOnly?)g.Max(v => v.VisitDate) })
                .ToDictionaryAsync(x => x.ResidentId, x => x.LastVisitDate);

            var lastRecordingByResident = await db.ProcessRecordings.AsNoTracking()
                .GroupBy(x => x.ResidentId)
                .Select(g => new { ResidentId = g.Key, LastSessionDate = (DateOnly?)g.Max(v => v.SessionDate) })
                .ToDictionaryAsync(x => x.ResidentId, x => x.LastSessionDate);

            var latestRiskCreatedAt = await db.MlPredictions.AsNoTracking()
                .Where(x => x.PredictionType == "resident_incident_30d" && x.EntityType == "Resident")
                .MaxAsync(x => (DateTime?)x.CreatedAtUtc);

            var riskByResident = new Dictionary<int, (decimal score, string? label)>();
            if (latestRiskCreatedAt is not null)
            {
                riskByResident = await db.MlPredictions.AsNoTracking()
                    .Where(x =>
                        x.PredictionType == "resident_incident_30d"
                        && x.EntityType == "Resident"
                        && x.CreatedAtUtc == latestRiskCreatedAt)
                    .GroupBy(x => x.EntityId)
                    .Select(g => new
                    {
                        ResidentId = g.Key,
                        Score = g.Select(v => v.Score).FirstOrDefault(),
                        Label = g.Select(v => v.Label).FirstOrDefault()
                    })
                    .ToDictionaryAsync(x => x.ResidentId, x => (x.Score, x.Label));
            }

            var alerts = residents
                .Select(x =>
                {
                    lastVisitByResident.TryGetValue(x.ResidentId, out var lastVisit);
                    lastRecordingByResident.TryGetValue(x.ResidentId, out var lastSession);
                    riskByResident.TryGetValue(x.ResidentId, out var risk);

                    var reasons = new List<string>();
                    if (lastVisit == null || lastVisit < checkinCutoff) reasons.Add("Home/field check-in due");
                    if (lastSession == null || lastSession < counselingCutoff) reasons.Add("Counseling session note overdue");
                    if (string.Equals(risk.label, "High", StringComparison.OrdinalIgnoreCase)) reasons.Add("High incident risk (30d)");

                    return new
                    {
                        x.ResidentId,
                        x.DisplayName,
                        x.SafehouseId,
                        x.AssignedSocialWorker,
                        lastHomeVisitDate = lastVisit,
                        lastProcessRecordingDate = lastSession,
                        riskScore = risk.score == 0m && risk.label is null ? (decimal?)null : risk.score,
                        riskBand = risk.label,
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
        catch (Exception ex)
        {
            HttpContext.RequestServices.GetRequiredService<ILogger<AnalyticsController>>()
                .LogError(ex, "ops-alerts query failed.");
            return Ok(new { asOfUtc = DateTime.UtcNow, items = Array.Empty<object>(), degraded = true });
        }
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

    [HttpGet("donor-stewardship")]
    public async Task<ActionResult> GetDonorStewardship()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var allSupporters = await db.Supporters.AsNoTracking()
            .Where(x => x.IsActive)
            .Select(x => new { x.SupporterId, x.FullName, x.SupporterType })
            .ToListAsync();

        var contributionAgg = await db.Contributions.AsNoTracking()
            .Where(x => x.ContributionType == "Monetary")
            .GroupBy(x => x.SupporterId)
            .Select(g => new
            {
                supporterId = g.Key,
                giftCount = g.Count(),
                totalPhp = g.Sum(x => x.Amount ?? 0m),
                firstGift = g.Min(x => x.ContributionDate),
                lastGift = g.Max(x => x.ContributionDate)
            })
            .ToListAsync();

        var allocAgg = await db.ImpactAllocations.AsNoTracking()
            .GroupBy(x => new { x.SupporterId, x.Category })
            .Select(g => new
            {
                supporterId = g.Key.SupporterId,
                category = g.Key.Category,
                totalPhp = g.Sum(x => x.Amount)
            })
            .ToListAsync();

        var perSupporterAlloc = allocAgg
            .GroupBy(x => x.supporterId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var supporterRows = contributionAgg
            .Select(x =>
            {
                var cadenceDays = Math.Max(1, (x.lastGift.DayNumber - x.firstGift.DayNumber) / Math.Max(1, x.giftCount - 1));
                var recencyDays = Math.Max(0, today.DayNumber - x.lastGift.DayNumber);
                var expectedWindow = (int)Math.Round(cadenceDays * 1.7);
                var lapseRisk = recencyDays >= expectedWindow;
                var ladderTier =
                    x.totalPhp >= 30000m ? "Major" :
                    x.totalPhp >= 10000m ? "Mid-tier" :
                    "Emerging";

                var ladderPrompt =
                    ladderTier == "Mid-tier"
                        ? "Invite this donor to fund a named program need such as a new safehouse bed or school-year package."
                        : ladderTier == "Emerging"
                            ? "Encourage recurring monthly giving with a clear first milestone."
                            : "Offer stewardship updates and major-gift partnership pathways.";

                perSupporterAlloc.TryGetValue(x.supporterId, out var allocs);
                var topOutcome = allocs?
                    .OrderByDescending(a => a.totalPhp)
                    .Select(a =>
                    {
                        if (!OutcomeMap.TryGetValue(a.category, out var map))
                        {
                            return $"{a.category}: ₱{a.totalPhp:N0} applied";
                        }

                        var units = map.unitPhp <= 0 ? 0 : (int)Math.Floor(a.totalPhp / map.unitPhp);
                        return units > 0
                            ? $"{a.category}: funded about {units} {map.outcome}{(units == 1 ? "" : "s")}."
                            : $"{a.category}: ₱{a.totalPhp:N0} applied to care services.";
                    })
                    .FirstOrDefault() ?? "No allocation narrative yet.";

                return new
                {
                    supporterId = x.supporterId,
                    giftCount = x.giftCount,
                    totalPhp = x.totalPhp,
                    cadenceDays,
                    recencyDays,
                    expectedWindowDays = expectedWindow,
                    lapseRisk,
                    ladderTier,
                    ladderPrompt,
                    outcomeNarrative = topOutcome
                };
            })
            .OrderByDescending(x => x.lapseRisk)
            .ThenByDescending(x => x.totalPhp)
            .ToList();

        var supporterNameById = allSupporters.ToDictionary(x => x.SupporterId, x => x.FullName);

        var watchlist = supporterRows
            .Where(x => x.lapseRisk)
            .Take(15)
            .Select(x => new
            {
                x.supporterId,
                displayName = supporterNameById.GetValueOrDefault(x.supporterId, $"Supporter {x.supporterId}"),
                x.recencyDays,
                x.expectedWindowDays,
                x.totalPhp,
                x.outcomeNarrative
            })
            .ToList();

        var midTier = supporterRows
            .Where(x => x.ladderTier == "Mid-tier")
            .Take(15)
            .Select(x => new
            {
                x.supporterId,
                displayName = supporterNameById.GetValueOrDefault(x.supporterId, $"Supporter {x.supporterId}"),
                x.totalPhp,
                x.giftCount,
                x.ladderPrompt
            })
            .ToList();

        return Ok(new
        {
            asOfUtc = DateTime.UtcNow,
            watchlist,
            donorLadderMidTier = midTier
        });
    }
}

