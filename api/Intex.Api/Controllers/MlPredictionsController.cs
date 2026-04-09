using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Policy = AppPolicies.StaffOnly)]
public sealed class MlPredictionsController(AppDbContext db) : ControllerBase
{
    private static readonly (string Type, string EntityType, string Purpose)[] ExpectedTypes =
    [
        ("donor_lapse_90d", "Supporter", "Retention risk"),
        ("donor_upgrade_next_amount", "Supporter", "Upgrade ask guidance"),
        ("next_channel_source", "Supporter", "Best outreach channel"),
        ("post_donation_value", "SocialPost", "Social conversion value"),
        ("safehouse_incident_next_month", "Safehouse", "Capacity and incident pressure"),
        ("resident_incident_30d", "Resident", "Resident incident risk"),
        ("resident_reintegration_readiness", "Resident", "Reintegration readiness")
    ];

    [HttpGet("types")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetTypes()
    {
        var types = await db.MlPredictions.AsNoTracking()
            .Select(x => x.PredictionType)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync();

        return Ok(types);
    }

    [HttpGet("coverage")]
    public async Task<ActionResult> GetCoverage()
    {
        var grouped = await db.MlPredictions.AsNoTracking()
            .GroupBy(x => x.PredictionType)
            .Select(g => new
            {
                predictionType = g.Key,
                rowCount = g.Count(),
                latestCreatedAtUtc = g.Max(x => x.CreatedAtUtc),
                entityTypes = g.Select(x => x.EntityType).Distinct().OrderBy(x => x).ToList()
            })
            .ToListAsync();

        var byType = grouped.ToDictionary(x => x.predictionType, StringComparer.OrdinalIgnoreCase);

        var expected = ExpectedTypes.Select(e =>
        {
            byType.TryGetValue(e.Type, out var hit);
            return new
            {
                predictionType = e.Type,
                entityType = e.EntityType,
                purpose = e.Purpose,
                present = hit is not null,
                rowCount = hit?.rowCount ?? 0,
                latestCreatedAtUtc = hit?.latestCreatedAtUtc
            };
        }).ToList();

        var additional = grouped
            .Where(x => !ExpectedTypes.Any(e => string.Equals(e.Type, x.predictionType, StringComparison.OrdinalIgnoreCase)))
            .Select(x => new
            {
                predictionType = x.predictionType,
                entityTypes = x.entityTypes,
                rowCount = x.rowCount,
                latestCreatedAtUtc = x.latestCreatedAtUtc
            })
            .ToList();

        return Ok(new
        {
            expectedTotal = ExpectedTypes.Length,
            expectedPresent = expected.Count(x => x.present),
            expectedMissing = expected.Count(x => !x.present),
            expected,
            additional
        });
    }

    [HttpGet("predictions")]
    public async Task<ActionResult> GetPredictions([FromQuery] string type, [FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 200);
        if (string.IsNullOrWhiteSpace(type)) return BadRequest(new { message = "type is required." });

        var items = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == type)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Score)
            .Take(take)
            .Select(x => new
            {
                x.PredictionId,
                x.PredictionType,
                x.EntityType,
                x.EntityId,
                x.Score,
                x.Label,
                x.PayloadJson,
                x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("donor-lapse/top")]
    public async Task<ActionResult> GetTopDonorLapse([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "donor_lapse_90d";

        var items = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == predictionType && x.EntityType == "Supporter")
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Score)
            .Take(take)
            .Join(
                db.Supporters.AsNoTracking(),
                p => p.EntityId,
                s => s.SupporterId,
                (p, s) => new
                {
                    supporterId = s.SupporterId,
                    displayName = s.FullName,
                    email = s.Email,
                    supporterType = s.SupporterType,
                    isActive = s.IsActive,
                    riskScore = p.Score,
                    riskBand = p.Label,
                    createdAtUtc = p.CreatedAtUtc
                }
            )
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("resident-risk/top")]
    public async Task<ActionResult> GetTopResidentRisk([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "resident_incident_30d";

        var items = await db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == predictionType && x.EntityType == "Resident")
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Score)
            .Take(take)
            .Join(
                db.Residents.AsNoTracking(),
                p => p.EntityId,
                r => r.ResidentId,
                (p, r) => new
                {
                    residentId = r.ResidentId,
                    displayName = r.DisplayName,
                    caseStatus = r.CaseStatus,
                    caseCategory = r.CaseCategory,
                    safehouseId = r.SafehouseId,
                    assignedSocialWorker = r.AssignedSocialWorker,
                    riskScore = p.Score,
                    riskBand = p.Label,
                    createdAtUtc = p.CreatedAtUtc
                }
            )
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("import")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult> Import(
        [FromBody] IReadOnlyList<MlPredictionImportItem> items,
        [FromQuery] bool replace = false
    )
    {
        if (items.Count == 0) return BadRequest(new { message = "No items provided." });

        var predictionType = items[0].PredictionType?.Trim();
        if (string.IsNullOrWhiteSpace(predictionType)) return BadRequest(new { message = "PredictionType is required." });

        if (items.Any(x => !string.Equals(x.PredictionType?.Trim(), predictionType, StringComparison.Ordinal)))
        {
            return BadRequest(new { message = "All items must have the same PredictionType per import call." });
        }

        if (replace)
        {
            var existing = await db.MlPredictions.Where(x => x.PredictionType == predictionType).ToListAsync();
            db.MlPredictions.RemoveRange(existing);
            await db.SaveChangesAsync();
        }

        var now = DateTime.UtcNow;
        var entities = items.Select(x => new MlPrediction
        {
            PredictionType = predictionType,
            EntityType = x.EntityType.Trim(),
            EntityId = x.EntityId,
            Score = x.Score,
            Label = string.IsNullOrWhiteSpace(x.Label) ? null : x.Label.Trim(),
            PayloadJson = string.IsNullOrWhiteSpace(x.PayloadJson) ? "{}" : x.PayloadJson,
            CreatedAtUtc = now
        }).ToList();

        db.MlPredictions.AddRange(entities);
        await db.SaveChangesAsync();

        return Ok(new { inserted = entities.Count, predictionType, replaced = replace });
    }
}
