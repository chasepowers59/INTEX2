using Intex.Api.Auth;
using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet("audit-activity")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> AuditActivity([FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 10, 300);
        var cutoffDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var processRows = await db.ProcessRecordings.AsNoTracking()
            .Where(x => x.SessionDate >= cutoffDate)
            .OrderByDescending(x => x.SessionDate)
            .Take(take)
            .Select(x => new
            {
                whenUtc = x.SessionDate.ToDateTime(TimeOnly.MinValue),
                actor = string.IsNullOrWhiteSpace(x.SocialWorkerName) ? "Staff" : x.SocialWorkerName,
                action = "Process recording logged",
                area = "Resident care",
                target = $"Resident {x.ResidentId}"
            })
            .ToListAsync();

        var visitRows = await db.HomeVisitations.AsNoTracking()
            .Where(x => x.VisitDate >= cutoffDate)
            .OrderByDescending(x => x.VisitDate)
            .Take(take)
            .Select(x => new
            {
                whenUtc = x.VisitDate.ToDateTime(TimeOnly.MinValue),
                actor = string.IsNullOrWhiteSpace(x.SocialWorkerName) ? "Staff" : x.SocialWorkerName,
                action = "Home visitation recorded",
                area = "Field operations",
                target = $"Resident {x.ResidentId}"
            })
            .ToListAsync();

        var allocationRows = await db.ImpactAllocations.AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(take)
            .Select(x => new
            {
                whenUtc = x.CreatedAtUtc,
                actor = "Admin",
                action = "Impact allocation created",
                area = "Donor stewardship",
                target = $"Supporter {x.SupporterId} · {x.Category}"
            })
            .ToListAsync();

        var publishedSnapshots = await db.PublicImpactSnapshots.AsNoTracking()
            .Where(x => x.IsPublished && x.PublishedAt != null)
            .OrderByDescending(x => x.PublishedAt)
            .Take(take)
            .Select(x => new
            {
                whenUtc = x.PublishedAt!.Value.ToDateTime(TimeOnly.MinValue),
                actor = "Admin",
                action = "Public snapshot published",
                area = "Public reporting",
                target = x.Headline
            })
            .ToListAsync();

        var items = processRows
            .Concat(visitRows)
            .Concat(allocationRows)
            .Concat(publishedSnapshots)
            .OrderByDescending(x => x.whenUtc)
            .Take(take)
            .ToList();

        return Ok(new { asOfUtc = DateTime.UtcNow, items });
    }

    [HttpGet("donations-by-month")]
    public async Task<ActionResult> DonationsByMonth([FromQuery] int months = 12)
    {
        months = Math.Clamp(months, 1, 36);
        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months + 1));

        var data = await db.Contributions.AsNoTracking()
            .Where(x => x.ContributionType == "Monetary" && x.ContributionDate >= from)
            .GroupBy(x => new { x.ContributionDate.Year, x.ContributionDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                totalAmount = g.Sum(x => x.Amount ?? 0m),
                count = g.Count()
            })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("resident-status")]
    public async Task<ActionResult> ResidentStatus()
    {
        var data = await db.Residents.AsNoTracking()
            .GroupBy(x => x.CaseStatus)
            .OrderBy(g => g.Key)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("safehouse-performance")]
    public async Task<ActionResult> SafehousePerformance()
    {
        var data = await db.Residents.AsNoTracking()
            .GroupBy(x => x.SafehouseId)
            .Select(g => new
            {
                safehouseId = g.Key,
                activeResidents = g.Count(x => x.CaseStatus == "Active"),
                reintegratedResidents = g.Count(x => x.IsReintegrated)
            })
            .OrderBy(x => x.safehouseId)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("reintegration-rate")]
    public async Task<ActionResult> ReintegrationRate()
    {
        var total = await db.Residents.AsNoTracking().CountAsync();
        var reintegrated = await db.Residents.AsNoTracking().CountAsync(x => x.IsReintegrated);
        var rate = total == 0 ? 0 : (double)reintegrated / total;
        return Ok(new { total, reintegrated, rate });
    }
}
