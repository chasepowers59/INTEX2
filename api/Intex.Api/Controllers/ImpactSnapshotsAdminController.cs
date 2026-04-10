using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/impact-snapshots")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class ImpactSnapshotsAdminController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List()
    {
        var items = await db.PublicImpactSnapshots.AsNoTracking()
            .OrderByDescending(x => x.SnapshotDate)
            .ThenByDescending(x => x.SnapshotId)
            .Take(50)
            .Select(x => new
            {
                x.SnapshotId,
                x.SnapshotDate,
                x.Headline,
                x.SummaryText,
                x.MetricPayloadJson,
                x.IsPublished,
                x.PublishedAt
            })
            .ToListAsync();

        return Ok(new { items });
    }

    public sealed record CreateImpactSnapshotRequest(
        DateOnly SnapshotDate,
        string Headline,
        string SummaryText,
        string MetricPayloadJson,
        bool Publish
    );

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateImpactSnapshotRequest req)
    {
        if (req.SnapshotDate == default) return BadRequest(new { message = "SnapshotDate is required." });
        if (string.IsNullOrWhiteSpace(req.Headline)) return BadRequest(new { message = "Headline is required." });
        if (string.IsNullOrWhiteSpace(req.SummaryText)) return BadRequest(new { message = "SummaryText is required." });

        var entity = new PublicImpactSnapshot
        {
            SnapshotDate = req.SnapshotDate,
            Headline = req.Headline.Trim(),
            SummaryText = req.SummaryText.Trim(),
            MetricPayloadJson = string.IsNullOrWhiteSpace(req.MetricPayloadJson) ? "{}" : req.MetricPayloadJson,
            IsPublished = req.Publish,
            PublishedAt = req.Publish ? DateOnly.FromDateTime(DateTime.UtcNow) : null
        };

        db.PublicImpactSnapshots.Add(entity);
        await db.SaveChangesAsync();

        return Ok(new { entity.SnapshotId });
    }

    public sealed record UpdateImpactSnapshotRequest(
        DateOnly SnapshotDate,
        string Headline,
        string SummaryText,
        string MetricPayloadJson
    );

    [HttpPut("{snapshotId:int}")]
    public async Task<ActionResult> Update([FromRoute] int snapshotId, [FromBody] UpdateImpactSnapshotRequest req)
    {
        if (req.SnapshotDate == default) return BadRequest(new { message = "SnapshotDate is required." });
        if (string.IsNullOrWhiteSpace(req.Headline)) return BadRequest(new { message = "Headline is required." });
        if (string.IsNullOrWhiteSpace(req.SummaryText)) return BadRequest(new { message = "SummaryText is required." });

        var snap = await db.PublicImpactSnapshots.FirstOrDefaultAsync(x => x.SnapshotId == snapshotId);
        if (snap == null) return NotFound(new { message = "Snapshot not found." });

        snap.SnapshotDate = req.SnapshotDate;
        snap.Headline = req.Headline.Trim();
        snap.SummaryText = req.SummaryText.Trim();
        snap.MetricPayloadJson = string.IsNullOrWhiteSpace(req.MetricPayloadJson) ? "{}" : req.MetricPayloadJson;
        await db.SaveChangesAsync();

        return Ok(new { snap.SnapshotId });
    }

    public sealed record PublishImpactSnapshotRequest(bool Publish);

    [HttpPut("{snapshotId:int}/publish")]
    public async Task<ActionResult> Publish([FromRoute] int snapshotId, [FromBody] PublishImpactSnapshotRequest req)
    {
        var snap = await db.PublicImpactSnapshots.FirstOrDefaultAsync(x => x.SnapshotId == snapshotId);
        if (snap == null) return NotFound(new { message = "Snapshot not found." });

        snap.IsPublished = req.Publish;
        snap.PublishedAt = req.Publish ? DateOnly.FromDateTime(DateTime.UtcNow) : null;
        await db.SaveChangesAsync();

        return Ok(new { snap.SnapshotId, snap.IsPublished, snap.PublishedAt });
    }

    [HttpDelete("{snapshotId:int}")]
    public async Task<ActionResult> Delete([FromRoute] int snapshotId, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { message = "Delete requires confirm=true" });

        var snap = await db.PublicImpactSnapshots.FirstOrDefaultAsync(x => x.SnapshotId == snapshotId);
        if (snap == null) return NotFound(new { message = "Snapshot not found." });

        db.PublicImpactSnapshots.Remove(snap);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

