using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public")]
public sealed class PublicController(AppDbContext db) : ControllerBase
{
    [HttpGet("impact-snapshots")]
    [AllowAnonymous]
    public async Task<ActionResult> GetPublishedImpactSnapshots()
    {
        var items = await db.PublicImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.SnapshotDate)
            .Take(12)
            .Select(x => new
            {
                x.SnapshotId,
                x.SnapshotDate,
                x.Headline,
                x.SummaryText,
                x.MetricPayloadJson
            })
            .ToListAsync();

        return Ok(items);
    }
}

