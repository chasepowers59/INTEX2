using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/contributions")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class ContributionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<object>>> GetAll(
        [FromQuery] int? supporterId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Contributions.AsNoTracking().Include(x => x.Supporter).AsQueryable();
        if (supporterId.HasValue)
        {
            query = query.Where(x => x.SupporterId == supporterId.Value);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.ContributionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.ContributionId,
                x.SupporterId,
                SupporterName = x.Supporter!.FullName,
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

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<Contribution>> Create([FromBody] Contribution input)
    {
        input.ContributionId = 0;
        db.Contributions.Add(input);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { contributionId = input.ContributionId }, input);
    }

    [HttpGet("{contributionId:int}")]
    public async Task<ActionResult<Contribution>> GetById([FromRoute] int contributionId)
    {
        var item = await db.Contributions.AsNoTracking().FirstOrDefaultAsync(x => x.ContributionId == contributionId);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{contributionId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int contributionId, [FromBody] Contribution input)
    {
        var item = await db.Contributions.FirstOrDefaultAsync(x => x.ContributionId == contributionId);
        if (item is null) return NotFound();

        item.SupporterId = input.SupporterId;
        item.ContributionType = input.ContributionType;
        item.Amount = input.Amount;
        item.Currency = input.Currency;
        item.ContributionDate = input.ContributionDate;
        item.CampaignName = input.CampaignName;
        item.Notes = input.Notes;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{contributionId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int contributionId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.Contributions.FirstOrDefaultAsync(x => x.ContributionId == contributionId);
        if (item is null) return NotFound();

        db.Contributions.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

