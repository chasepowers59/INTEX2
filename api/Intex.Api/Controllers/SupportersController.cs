using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/supporters")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class SupportersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<Supporter>>> GetAll(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Supporters.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x => x.FullName.Contains(q) || (x.Email != null && x.Email.Contains(q)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(x => x.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<Supporter>(page, pageSize, total, items));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<Supporter>> Create([FromBody] Supporter input)
    {
        input.SupporterId = 0;
        input.CreatedAtUtc = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(input.DisplayName))
            input.DisplayName = input.FullName;

        db.Supporters.Add(input);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { supporterId = input.SupporterId }, input);
    }

    [HttpGet("{supporterId:int}")]
    public async Task<ActionResult<Supporter>> GetById([FromRoute] int supporterId)
    {
        var item = await db.Supporters.AsNoTracking().FirstOrDefaultAsync(x => x.SupporterId == supporterId);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{supporterId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Update([FromRoute] int supporterId, [FromBody] Supporter input)
    {
        var item = await db.Supporters.FirstOrDefaultAsync(x => x.SupporterId == supporterId);
        if (item is null) return NotFound();

        item.FullName = input.FullName;
        item.DisplayName = string.IsNullOrWhiteSpace(input.DisplayName) ? input.FullName : input.DisplayName;
        item.Email = input.Email;
        item.SupporterType = input.SupporterType;
        item.IsActive = input.IsActive;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{supporterId:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Delete([FromRoute] int supporterId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Deletion requires confirm=true." });

        var item = await db.Supporters.FirstOrDefaultAsync(x => x.SupporterId == supporterId);
        if (item is null) return NotFound();

        db.Supporters.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

