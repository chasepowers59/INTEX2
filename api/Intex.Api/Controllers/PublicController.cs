using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicController(AppDbContext db) : ControllerBase
{
    [HttpGet("impact-snapshots")]
    [AllowAnonymous]
    public async Task<ActionResult> GetPublishedImpactSnapshots()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var snapshots = await db.PublicImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished && x.SnapshotDate <= today)
            .OrderByDescending(x => x.SnapshotDate)
            .Take(24)
            .ToListAsync();

        var filtered = snapshots
            .Where(HasMeaningfulSnapshotPayload)
            .Take(12)
            .ToList();

        var items = (filtered.Count > 0 ? filtered : snapshots.Take(12))
            .Select(x => new
            {
                x.SnapshotId,
                x.SnapshotDate,
                x.Headline,
                x.SummaryText,
                x.MetricPayloadJson
            })
            .ToList();

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
        var today = DateOnly.FromDateTime(nowUtc);
        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);

        var activeSafehouses = await db.Safehouses.AsNoTracking()
            .CountAsync(x => x.Status == "Active");

        var capacity = await db.Safehouses.AsNoTracking()
            .Where(x => x.Status == "Active")
            .Select(x => new { x.CapacityGirls, x.CurrentOccupancy })
            .ToListAsync();

        var totalBeds = capacity.Sum(x => x.CapacityGirls);
        var totalHoused = capacity.Sum(x => x.CurrentOccupancy);

        object? latestMonthSummary = null;
        var monthlyRows = await db.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(x => x.MonthStart <= currentMonthStart)
            .OrderByDescending(x => x.MonthStart)
            .ToListAsync();

        var latestMonth = monthlyRows
            .GroupBy(x => x.MonthStart)
            .OrderByDescending(g => g.Key)
            .FirstOrDefault(HasMeaningfulMonth)
            ?? monthlyRows
                .GroupBy(x => x.MonthStart)
                .OrderByDescending(g => g.Key)
                .FirstOrDefault();

        if (latestMonth is not null)
        {
            var rows = latestMonth.ToList();
            if (rows.Count > 0)
            {
                var edu = rows.Where(x => x.AvgEducationProgress.HasValue).Select(x => x.AvgEducationProgress!.Value).ToList();
                var health = rows.Where(x => x.AvgHealthScore.HasValue).Select(x => x.AvgHealthScore!.Value).ToList();
                latestMonthSummary = new
                {
                    monthStart = latestMonth.Key,
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

    private static bool HasMeaningfulMonth(IGrouping<DateOnly, SafehouseMonthlyMetric> rows)
        => rows.Any(x =>
            x.ActiveResidents > 0
            || (x.AvgEducationProgress ?? 0m) > 0m
            || (x.AvgHealthScore ?? 0m) > 0m
            || x.ProcessRecordingCount > 0
            || x.HomeVisitationCount > 0
            || x.IncidentCount > 0);

    private static bool HasMeaningfulSnapshotPayload(PublicImpactSnapshot snapshot)
    {
        if (string.IsNullOrWhiteSpace(snapshot.MetricPayloadJson))
        {
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(snapshot.MetricPayloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return true;
            }

            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                var value = prop.Value;
                if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number) && number > 0m)
                {
                    return true;
                }

                if (value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString()))
                {
                    return true;
                }

                if (value.ValueKind == JsonValueKind.True)
                {
                    return true;
                }
            }

            return false;
        }
        catch (JsonException)
        {
            return true;
        }
    }
}

