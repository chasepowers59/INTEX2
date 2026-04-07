using Intex.Api.Auth;
using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/admin-dashboard")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class AdminDashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary()
    {
        var nowUtc = DateTime.UtcNow;
        var recentContributionCutoff = DateOnly.FromDateTime(nowUtc.AddDays(-30));

        var activeResidents = await db.Residents.AsNoTracking().CountAsync(x => x.CaseStatus == "Active");
        var recentDonations = await db.Contributions.AsNoTracking()
            .CountAsync(x => x.ContributionType == "Monetary" && x.ContributionDate >= recentContributionCutoff);
        var upcomingConferences = await db.CaseConferences.AsNoTracking()
            .CountAsync(x => !x.IsCompleted && x.ScheduledAtUtc >= nowUtc && x.ScheduledAtUtc <= nowUtc.AddDays(14));

        var bySafehouse = await db.Residents.AsNoTracking()
            .GroupBy(x => x.SafehouseId)
            .Select(g => new { SafehouseId = g.Key, ActiveResidents = g.Count(x => x.CaseStatus == "Active") })
            .ToListAsync();

        return Ok(new
        {
            activeResidents,
            recentDonations,
            upcomingConferences,
            bySafehouse
        });
    }
}

