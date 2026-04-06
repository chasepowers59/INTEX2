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
                totalAmount = g.Sum(x => x.Amount),
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
