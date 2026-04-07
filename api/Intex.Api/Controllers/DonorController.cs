using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
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
        string ContributionType,
        decimal? Amount,
        decimal? EstimatedValue,
        string? ImpactUnit,
        string? Currency,
        string? CampaignName,
        string? Notes,
        string? ChannelSource,
        bool IsRecurring,
        List<InKindDonationItemRequest>? InKindItems
    );

    public sealed record InKindDonationItemRequest(
        string ItemName,
        string ItemCategory,
        int Quantity,
        string UnitOfMeasure,
        decimal? EstimatedUnitValue,
        string? IntendedUse,
        string? ReceivedCondition
    );

    [HttpPost("donate")]
    public async Task<ActionResult> Donate([FromBody] DonateRequest req)
    {
        var type = string.IsNullOrWhiteSpace(req.ContributionType) ? "Monetary" : req.ContributionType.Trim();
        var isMonetary = string.Equals(type, "Monetary", StringComparison.OrdinalIgnoreCase);
        if (isMonetary && (!req.Amount.HasValue || req.Amount <= 0)) return BadRequest(new { message = "Amount must be greater than 0." });
        if (req.Amount.HasValue && req.Amount > 1_000_000_000m) return BadRequest(new { message = "Amount is too large." });

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
            ContributionType = type,
            Amount = req.Amount,
            EstimatedValue = req.EstimatedValue,
            ImpactUnit = string.IsNullOrWhiteSpace(req.ImpactUnit) ? null : req.ImpactUnit.Trim(),
            Currency = currency,
            ContributionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ChannelSource = string.IsNullOrWhiteSpace(req.ChannelSource) ? null : req.ChannelSource.Trim(),
            IsRecurring = req.IsRecurring,
            CampaignName = string.IsNullOrWhiteSpace(req.CampaignName) ? null : req.CampaignName.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim()
        };

        db.Contributions.Add(entity);
        await db.SaveChangesAsync();

        if (req.InKindItems is { Count: > 0 })
        {
            foreach (var i in req.InKindItems.Where(x => !string.IsNullOrWhiteSpace(x.ItemName)))
            {
                db.InKindDonationItems.Add(new InKindDonationItem
                {
                    ContributionId = entity.ContributionId,
                    ItemName = i.ItemName.Trim(),
                    ItemCategory = string.IsNullOrWhiteSpace(i.ItemCategory) ? "General" : i.ItemCategory.Trim(),
                    Quantity = Math.Max(1, i.Quantity),
                    UnitOfMeasure = string.IsNullOrWhiteSpace(i.UnitOfMeasure) ? "unit" : i.UnitOfMeasure.Trim(),
                    EstimatedUnitValue = i.EstimatedUnitValue,
                    IntendedUse = string.IsNullOrWhiteSpace(i.IntendedUse) ? null : i.IntendedUse.Trim(),
                    ReceivedCondition = string.IsNullOrWhiteSpace(i.ReceivedCondition) ? null : i.ReceivedCondition.Trim()
                });
            }
            await db.SaveChangesAsync();
        }

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
