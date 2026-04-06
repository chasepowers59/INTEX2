using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/home-visitations")]
[Authorize]
public sealed class HomeVisitationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<HomeVisitation>>> GetAll(
        [FromQuery] int residentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.HomeVisitations.AsNoTracking().Where(x => x.ResidentId == residentId);
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.VisitDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<HomeVisitation>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<HomeVisitation>> Create([FromBody] HomeVisitation input)
    {
        input.HomeVisitationId = 0;
        db.HomeVisitations.Add(input);
        await db.SaveChangesAsync();
        return Ok(input);
    }

    [HttpPut("{homeVisitationId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int homeVisitationId, [FromBody] HomeVisitation input)
    {
        var item = await db.HomeVisitations.FirstOrDefaultAsync(x => x.HomeVisitationId == homeVisitationId);
        if (item is null) return NotFound();

        item.VisitDate = input.VisitDate;
        item.VisitType = input.VisitType;
        item.Observations = input.Observations;
        item.FamilyCooperationLevel = input.FamilyCooperationLevel;
        item.SafetyConcerns = input.SafetyConcerns;
        item.FollowUpActions = input.FollowUpActions;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{homeVisitationId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int homeVisitationId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.HomeVisitations.FirstOrDefaultAsync(x => x.HomeVisitationId == homeVisitationId);
        if (item is null) return NotFound();

        db.HomeVisitations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

