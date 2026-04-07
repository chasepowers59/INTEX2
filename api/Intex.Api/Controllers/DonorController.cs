using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donor")]
[Authorize(Roles = AppRoles.Donor)]
public sealed class DonorController(AppDbContext db, Microsoft.AspNetCore.Identity.UserManager<AppUser> userManager) : ControllerBase
{
    public sealed record DonateRequest(
        decimal Amount,
        string? Currency,
        string? CampaignName,
        string? Notes
    );

    [HttpPost("donate")]
    public async Task<ActionResult> Donate([FromBody] DonateRequest req)
    {
        if (req.Amount <= 0) return BadRequest(new { message = "Amount must be greater than 0." });
        if (req.Amount > 1_000_000_000m) return BadRequest(new { message = "Amount is too large." });

        var userId = userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var user = await userManager.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null || user.SupporterId is null)
        {
            return BadRequest(new { message = "Donor account is not linked to a supporter record yet." });
        }

        var currency = string.IsNullOrWhiteSpace(req.Currency) ? "PHP" : req.Currency.Trim();
        if (currency.Length > 10) return BadRequest(new { message = "Invalid currency." });

        var entity = new Models.Contribution
        {
            SupporterId = user.SupporterId.Value,
            ContributionType = "Monetary",
            Amount = req.Amount,
            Currency = currency,
            ContributionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CampaignName = string.IsNullOrWhiteSpace(req.CampaignName) ? null : req.CampaignName.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim()
        };

        db.Contributions.Add(entity);
        await db.SaveChangesAsync();

        return Ok(new { entity.ContributionId });
    }

    [HttpGet("contributions")]
    public async Task<ActionResult<PagedResult<object>>> MyContributions([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var userId = userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var user = await userManager.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null || user.SupporterId is null) return Ok(new PagedResult<object>(page, pageSize, 0, []));

        var query = db.Contributions.AsNoTracking()
            .Where(x => x.SupporterId == user.SupporterId.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.ContributionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.ContributionId,
                x.ContributionType,
                x.Amount,
                x.Currency,
                x.ContributionDate,
                x.CampaignName,
                x.Notes
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(page, pageSize, total, items));
    }

    [HttpGet("allocations")]
    public async Task<ActionResult> MyAllocations([FromQuery] int months = 12)
    {
        months = Math.Clamp(months, 1, 24);

        var userId = userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var user = await userManager.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null || user.SupporterId is null) return Ok(new { months, items = Array.Empty<object>() });

        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months + 1));

        var items = await db.ImpactAllocations.AsNoTracking()
            .Where(x => x.SupporterId == user.SupporterId.Value && x.AllocationDate >= from)
            .GroupBy(x => new { x.AllocationDate.Year, x.AllocationDate.Month, x.Category, x.Currency })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month).ThenBy(g => g.Key.Category)
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                category = g.Key.Category,
                currency = g.Key.Currency,
                totalAmount = g.Sum(x => x.Amount),
                count = g.Count()
            })
            .ToListAsync();

        return Ok(new { months, items });
    }
}
