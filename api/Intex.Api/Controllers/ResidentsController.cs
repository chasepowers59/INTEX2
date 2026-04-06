using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class ResidentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<object>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? safehouseId,
        [FromQuery] string? category,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Residents.AsNoTracking().Include(x => x.Safehouse).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.CaseStatus == status);
        if (safehouseId.HasValue)
            query = query.Where(x => x.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(x => x.CaseCategory == category);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.DisplayName.Contains(q) || (x.AssignedSocialWorker != null && x.AssignedSocialWorker.Contains(q)));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(x => x.DisplayName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.ResidentId,
                x.DisplayName,
                x.CaseStatus,
                x.CaseCategory,
                x.SubCategory,
                x.SafehouseId,
                SafehouseName = x.Safehouse!.Name,
                x.AdmissionDate,
                x.AssignedSocialWorker,
                x.IsReintegrated
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(page, pageSize, total, items));
    }

    [HttpGet("{residentId:int}")]
    public async Task<ActionResult<Resident>> GetById([FromRoute] int residentId)
    {
        var item = await db.Residents.AsNoTracking().FirstOrDefaultAsync(x => x.ResidentId == residentId);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<Resident>> Create([FromBody] Resident input)
    {
        input.ResidentId = 0;
        db.Residents.Add(input);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { residentId = input.ResidentId }, input);
    }

    [HttpPut("{residentId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int residentId, [FromBody] Resident input)
    {
        var item = await db.Residents.FirstOrDefaultAsync(x => x.ResidentId == residentId);
        if (item is null) return NotFound();

        item.DisplayName = input.DisplayName;
        item.CaseStatus = input.CaseStatus;
        item.CaseCategory = input.CaseCategory;
        item.SubCategory = input.SubCategory;
        item.SafehouseId = input.SafehouseId;
        item.AdmissionDate = input.AdmissionDate;
        item.AssignedSocialWorker = input.AssignedSocialWorker;
        item.IsReintegrated = input.IsReintegrated;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{residentId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int residentId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.Residents.FirstOrDefaultAsync(x => x.ResidentId == residentId);
        if (item is null) return NotFound();

        db.Residents.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

