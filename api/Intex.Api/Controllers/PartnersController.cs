using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/partners")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class PartnersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<Partner>>> GetAll([FromQuery] string? q, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Partners.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.PartnerName.Contains(q) || (x.Region != null && x.Region.Contains(q)));
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var total = await query.CountAsync();
        var items = await query.OrderBy(x => x.PartnerName).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PagedResult<Partner>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<Partner>> Create([FromBody] Partner input)
    {
        input.PartnerId = 0;
        db.Partners.Add(input);
        await db.SaveChangesAsync();
        return Ok(input);
    }

    [HttpPut("{partnerId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int partnerId, [FromBody] Partner input)
    {
        var item = await db.Partners.FirstOrDefaultAsync(x => x.PartnerId == partnerId);
        if (item is null) return NotFound();

        item.PartnerName = input.PartnerName;
        item.PartnerType = input.PartnerType;
        item.RoleType = input.RoleType;
        item.ContactName = input.ContactName;
        item.Email = input.Email;
        item.Phone = input.Phone;
        item.Region = input.Region;
        item.Status = input.Status;
        item.StartDate = input.StartDate;
        item.EndDate = input.EndDate;
        item.Notes = input.Notes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{partnerId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int partnerId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });
        var item = await db.Partners.FirstOrDefaultAsync(x => x.PartnerId == partnerId);
        if (item is null) return NotFound();
        db.Partners.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
