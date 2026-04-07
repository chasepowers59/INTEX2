using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/impact-allocations")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class ImpactAllocationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<object>>> List(
        [FromQuery] int? supporterId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] string? category = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.ImpactAllocations.AsNoTracking();

        if (supporterId.HasValue) query = query.Where(x => x.SupporterId == supporterId.Value);
        if (from.HasValue) query = query.Where(x => x.AllocationDate >= from.Value);
        if (to.HasValue) query = query.Where(x => x.AllocationDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.AllocationDate)
            .ThenByDescending(x => x.ImpactAllocationId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                db.Supporters.AsNoTracking(),
                a => a.SupporterId,
                s => s.SupporterId,
                (a, s) => new
                {
                    a.ImpactAllocationId,
                    a.SupporterId,
                    supporterName = s.FullName,
                    a.SnapshotId,
                    a.AllocationDate,
                    a.Category,
                    a.Amount,
                    a.Currency,
                    a.Notes,
                    a.CreatedAtUtc
                }
            )
            .ToListAsync();

        return Ok(new PagedResult<object>(page, pageSize, total, items));
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] ImpactAllocationCreateRequest req)
    {
        if (req.SupporterId <= 0) return BadRequest(new { message = "SupporterId is required." });
        if (req.AllocationDate == default) return BadRequest(new { message = "AllocationDate is required." });
        if (string.IsNullOrWhiteSpace(req.Category)) return BadRequest(new { message = "Category is required." });
        if (!string.IsNullOrWhiteSpace(req.Currency) && req.Currency.Length > 10) return BadRequest(new { message = "Invalid currency." });

        var supporterExists = await db.Supporters.AsNoTracking().AnyAsync(x => x.SupporterId == req.SupporterId);
        if (!supporterExists) return BadRequest(new { message = "Supporter not found." });

        if (req.SnapshotId.HasValue)
        {
            var snapExists = await db.PublicImpactSnapshots.AsNoTracking().AnyAsync(x => x.SnapshotId == req.SnapshotId.Value);
            if (!snapExists) return BadRequest(new { message = "SnapshotId not found." });
        }

        var entity = new ImpactAllocation
        {
            SupporterId = req.SupporterId,
            SnapshotId = req.SnapshotId,
            AllocationDate = req.AllocationDate,
            Category = req.Category.Trim(),
            Amount = req.Amount,
            Currency = string.IsNullOrWhiteSpace(req.Currency) ? "PHP" : req.Currency.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        db.ImpactAllocations.Add(entity);
        await db.SaveChangesAsync();
        return Ok(new { entity.ImpactAllocationId });
    }

    [HttpPut("{impactAllocationId:int}")]
    public async Task<ActionResult> Update([FromRoute] int impactAllocationId, [FromBody] ImpactAllocationUpdateRequest req)
    {
        if (impactAllocationId != req.ImpactAllocationId) return BadRequest(new { message = "ID mismatch." });
        if (string.IsNullOrWhiteSpace(req.Category)) return BadRequest(new { message = "Category is required." });

        var entity = await db.ImpactAllocations.FirstOrDefaultAsync(x => x.ImpactAllocationId == impactAllocationId);
        if (entity is null) return NotFound(new { message = "Not found." });

        entity.SupporterId = req.SupporterId;
        entity.SnapshotId = req.SnapshotId;
        entity.AllocationDate = req.AllocationDate;
        entity.Category = req.Category.Trim();
        entity.Amount = req.Amount;
        entity.Currency = string.IsNullOrWhiteSpace(req.Currency) ? "PHP" : req.Currency.Trim();
        entity.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        await db.SaveChangesAsync();
        return Ok(new { entity.ImpactAllocationId });
    }

    [HttpDelete("{impactAllocationId:int}")]
    public async Task<ActionResult> Delete([FromRoute] int impactAllocationId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Delete requires confirm=true" });

        var entity = await db.ImpactAllocations.FirstOrDefaultAsync(x => x.ImpactAllocationId == impactAllocationId);
        if (entity is null) return NotFound(new { message = "Not found." });

        db.ImpactAllocations.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { deleted = impactAllocationId });
    }
}

