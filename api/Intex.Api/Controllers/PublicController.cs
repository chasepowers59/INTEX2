using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicController(AppDbContext db) : ControllerBase
{
    [HttpGet("impact-snapshots")]
    [AllowAnonymous]
    public async Task<ActionResult> GetPublishedImpactSnapshots()
    {
        var items = await db.PublicImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.SnapshotDate)
            .Take(12)
            .Select(x => new
            {
                x.SnapshotId,
                x.SnapshotDate,
                x.Headline,
                x.SummaryText,
                x.MetricPayloadJson
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// Anonymized, aggregate metrics for public donors and partners (no individuals). Aligns with Appendix A outreach + safehouse domains.
    /// </summary>
    [HttpGet("impact-highlights")]
    [AllowAnonymous]
    public async Task<ActionResult> GetImpactHighlights()
    {
        var nowUtc = DateTime.UtcNow;

        var activeSafehouses = await db.Safehouses.AsNoTracking()
            .CountAsync(x => x.Status == "Active");

        var capacity = await db.Safehouses.AsNoTracking()
            .Where(x => x.Status == "Active")
            .Select(x => new { x.CapacityGirls, x.CurrentOccupancy })
            .ToListAsync();

        var totalBeds = capacity.Sum(x => x.CapacityGirls);
        var totalHoused = capacity.Sum(x => x.CurrentOccupancy);

        var latestMonth = await db.SafehouseMonthlyMetrics.AsNoTracking()
            .MaxAsync(x => (DateOnly?)x.MonthStart);

        object? latestMonthSummary = null;
        if (latestMonth != null)
        {
            var rows = await db.SafehouseMonthlyMetrics.AsNoTracking()
                .Where(x => x.MonthStart == latestMonth)
                .ToListAsync();

            if (rows.Count > 0)
            {
                var edu = rows.Where(x => x.AvgEducationProgress.HasValue).Select(x => x.AvgEducationProgress!.Value).ToList();
                var health = rows.Where(x => x.AvgHealthScore.HasValue).Select(x => x.AvgHealthScore!.Value).ToList();
                latestMonthSummary = new
                {
                    monthStart = latestMonth.Value,
                    activeResidentsTotal = rows.Sum(x => x.ActiveResidents),
                    avgEducationProgress = edu.Count > 0 ? Math.Round(edu.Average(), 1) : (decimal?)null,
                    avgHealthScore = health.Count > 0 ? Math.Round(health.Average(), 2) : (decimal?)null,
                    counselingSessionsMonth = rows.Sum(x => x.ProcessRecordingCount),
                    homeVisitsMonth = rows.Sum(x => x.HomeVisitationCount),
                    incidentsMonth = rows.Sum(x => x.IncidentCount)
                };
            }
        }

        var socialAttributedPhp = await db.SocialMediaPosts.AsNoTracking()
            .SumAsync(x => x.EstimatedDonationValuePhp ?? 0m);

        var socialReferralPosts = await db.SocialMediaPosts.AsNoTracking()
            .CountAsync(x => (x.DonationReferrals ?? 0) > 0);

        var publishedSnapshots = await db.PublicImpactSnapshots.AsNoTracking()
            .CountAsync(x => x.IsPublished);

        var activeSupporters = await db.Supporters.AsNoTracking()
            .CountAsync(x => x.Status == "Active");

        return Ok(new
        {
            asOfUtc = nowUtc,
            activeSafehouses,
            totalBedsCapacity = totalBeds,
            totalCurrentOccupancy = totalHoused,
            latestMonthSummary,
            socialEstimatedDonationValuePhp = socialAttributedPhp,
            socialPostsWithDonationReferrals = socialReferralPosts,
            publishedImpactSnapshots = publishedSnapshots,
            activeSupporters
        });
    }
}

