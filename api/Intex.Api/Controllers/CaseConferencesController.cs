using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/case-conferences")]
[Authorize]
public sealed class CaseConferencesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<CaseConference>>> GetAll(
        [FromQuery] int? residentId,
        [FromQuery] bool upcomingOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.CaseConferences.AsNoTracking().AsQueryable();
        if (residentId.HasValue)
            query = query.Where(x => x.ResidentId == residentId.Value);
        if (upcomingOnly)
            query = query.Where(x => !x.IsCompleted && x.ScheduledAtUtc >= DateTime.UtcNow.AddDays(-1));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(x => x.ScheduledAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<CaseConference>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<CaseConference>> Create([FromBody] CaseConference input)
    {
        input.CaseConferenceId = 0;
        db.CaseConferences.Add(input);
        await db.SaveChangesAsync();
        return Ok(input);
    }

    [HttpPut("{caseConferenceId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int caseConferenceId, [FromBody] CaseConference input)
    {
        var item = await db.CaseConferences.FirstOrDefaultAsync(x => x.CaseConferenceId == caseConferenceId);
        if (item is null) return NotFound();

        item.ScheduledAtUtc = input.ScheduledAtUtc;
        item.Topic = input.Topic;
        item.Notes = input.Notes;
        item.IsCompleted = input.IsCompleted;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{caseConferenceId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int caseConferenceId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.CaseConferences.FirstOrDefaultAsync(x => x.CaseConferenceId == caseConferenceId);
        if (item is null) return NotFound();

        db.CaseConferences.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

