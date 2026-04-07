using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/partner-assignments")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class PartnerAssignmentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<object>>> GetAll(
        [FromQuery] int? safehouseId,
        [FromQuery] string? programArea,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.PartnerAssignments.AsNoTracking()
            .Include(x => x.Partner)
            .Include(x => x.Safehouse)
            .AsQueryable();

        if (safehouseId.HasValue)
            query = query.Where(x => x.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(programArea))
            query = query.Where(x => x.ProgramArea == programArea);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(x => x.ProgramArea)
            .ThenBy(x => x.AssignmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.AssignmentId,
                x.PartnerId,
                partnerName = x.Partner!.PartnerName,
                x.SafehouseId,
                safehouseName = x.Safehouse != null ? x.Safehouse.Name : null,
                x.ProgramArea,
                x.AssignmentStart,
                x.AssignmentEnd,
                x.ResponsibilityNotes,
                x.IsPrimary,
                x.Status
            })
            .ToListAsync();
        return Ok(new PagedResult<object>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<PartnerAssignment>> Create([FromBody] PartnerAssignment input)
    {
        input.AssignmentId = 0;
        db.PartnerAssignments.Add(input);
        await db.SaveChangesAsync();
        return Ok(input);
    }

    [HttpPut("{assignmentId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int assignmentId, [FromBody] PartnerAssignment input)
    {
        var item = await db.PartnerAssignments.FirstOrDefaultAsync(x => x.AssignmentId == assignmentId);
        if (item is null) return NotFound();
        item.PartnerId = input.PartnerId;
        item.SafehouseId = input.SafehouseId;
        item.ProgramArea = input.ProgramArea;
        item.AssignmentStart = input.AssignmentStart;
        item.AssignmentEnd = input.AssignmentEnd;
        item.ResponsibilityNotes = input.ResponsibilityNotes;
        item.IsPrimary = input.IsPrimary;
        item.Status = input.Status;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{assignmentId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int assignmentId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });
        var item = await db.PartnerAssignments.FirstOrDefaultAsync(x => x.AssignmentId == assignmentId);
        if (item is null) return NotFound();
        db.PartnerAssignments.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
