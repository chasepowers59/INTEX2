using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize]
public sealed class ProcessRecordingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProcessRecording>>> GetAll(
        [FromQuery] int residentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.ProcessRecordings.AsNoTracking().Where(x => x.ResidentId == residentId);
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.SessionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<ProcessRecording>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<ProcessRecording>> Create([FromBody] ProcessRecording input)
    {
        input.ProcessRecordingId = 0;
        db.ProcessRecordings.Add(input);
        await db.SaveChangesAsync();
        return Ok(input);
    }

    [HttpPut("{processRecordingId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int processRecordingId, [FromBody] ProcessRecording input)
    {
        var item = await db.ProcessRecordings.FirstOrDefaultAsync(x => x.ProcessRecordingId == processRecordingId);
        if (item is null) return NotFound();

        item.SessionDate = input.SessionDate;
        item.SocialWorkerName = input.SocialWorkerName;
        item.SessionType = input.SessionType;
        item.EmotionalStateObserved = input.EmotionalStateObserved;
        item.NarrativeSummary = input.NarrativeSummary;
        item.InterventionsApplied = input.InterventionsApplied;
        item.FollowUpActions = input.FollowUpActions;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{processRecordingId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int processRecordingId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.ProcessRecordings.FirstOrDefaultAsync(x => x.ProcessRecordingId == processRecordingId);
        if (item is null) return NotFound();

        db.ProcessRecordings.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

