using System.Globalization;
using System.Text.Json;
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

        var items = await BuildCurrentPredictionQuery(type)
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.EntityId)
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

        var predictions = await GetLatestBatchAsync(predictionType, "Supporter", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var supporters = await LoadSupportersAsync(predictions);
        var items = predictions.Select(p =>
        {
            supporters.TryGetValue(p.EntityId, out var supporter);
            return new
            {
                supporterId = p.EntityId,
                displayName = supporter?.FullName ?? $"Supporter {p.EntityId}",
                email = supporter?.Email,
                supporterType = supporter?.SupporterType,
                isActive = supporter?.IsActive ?? false,
                riskScore = p.Score,
                riskBand = p.Label,
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("donor-upgrade/top")]
    public async Task<ActionResult> GetTopDonorUpgrade([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "donor_upgrade_next_amount";

        var predictions = await GetLatestBatchAsync(predictionType, "Supporter", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var supporters = await LoadSupportersAsync(predictions);
        var items = predictions.Select(p =>
        {
            supporters.TryGetValue(p.EntityId, out var supporter);
            using var payload = ParsePayload(p.PayloadJson);
            return new
            {
                supporterId = p.EntityId,
                displayName = supporter?.FullName ?? $"Supporter {p.EntityId}",
                email = supporter?.Email,
                supporterType = supporter?.SupporterType,
                predictedNextAmount = ReadDecimal(payload.RootElement, "predicted_next_amount"),
                askTier = ReadString(payload.RootElement, "ask_tier") ?? p.Label,
                upgradeRatio = ReadDecimal(payload.RootElement, "upgrade_ratio"),
                donationsSoFar = ReadInt(payload.RootElement, "donations_so_far"),
                acquisitionChannel = ReadString(payload.RootElement, "acquisition_channel"),
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("next-channel/top")]
    public async Task<ActionResult> GetTopNextChannel([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "next_channel_source";

        var predictions = await GetLatestBatchAsync(predictionType, "Supporter", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var supporters = await LoadSupportersAsync(predictions);
        var items = predictions.Select(p =>
        {
            supporters.TryGetValue(p.EntityId, out var supporter);
            using var payload = ParsePayload(p.PayloadJson);
            return new
            {
                supporterId = p.EntityId,
                displayName = supporter?.FullName ?? $"Supporter {p.EntityId}",
                email = supporter?.Email,
                predictedChannel = ReadString(payload.RootElement, "predicted_channel") ?? p.Label ?? "Unknown",
                confidence = ReadDecimal(payload.RootElement, "confidence") ?? p.Score,
                campaignName = ReadString(payload.RootElement, "campaign_name"),
                acquisitionChannel = ReadString(payload.RootElement, "acquisition_channel"),
                supporterType = ReadString(payload.RootElement, "supporter_type") ?? supporter?.SupporterType,
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("social-post-value/top")]
    public async Task<ActionResult> GetTopSocialPostValue([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "post_donation_value";

        var predictions = await GetLatestBatchAsync(predictionType, "SocialPost", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var postIds = predictions.Select(x => x.EntityId).Distinct().ToList();
        var posts = await db.SocialMediaPosts.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId))
            .ToDictionaryAsync(x => x.PostId);

        var items = predictions.Select(p =>
        {
            posts.TryGetValue(p.EntityId, out var post);
            using var payload = ParsePayload(p.PayloadJson);
            return new
            {
                postId = p.EntityId,
                platform = post?.Platform ?? ReadString(payload.RootElement, "platform") ?? "Unknown",
                postType = post?.PostType ?? "Unknown",
                campaignName = post?.CampaignName,
                predictedValuePhp = ReadDecimal(payload.RootElement, "predicted_value_php") ?? p.Score,
                valueBand = ReadString(payload.RootElement, "value_band") ?? p.Label,
                contentTopic = ReadString(payload.RootElement, "content_topic") ?? post?.ContentTopic,
                callToActionType = ReadString(payload.RootElement, "call_to_action_type") ?? post?.CallToActionType,
                estimatedValuePhp = post?.EstimatedDonationValuePhp,
                donationReferrals = post?.DonationReferrals,
                isBoosted = post?.IsBoosted,
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("safehouse-forecast/top")]
    public async Task<ActionResult> GetTopSafehouseForecast([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "safehouse_incident_next_month";

        var predictions = await GetLatestBatchAsync(predictionType, "Safehouse", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var safehouses = await LoadSafehousesAsync(predictions);
        var items = predictions.Select(p =>
        {
            safehouses.TryGetValue(p.EntityId, out var safehouse);
            using var payload = ParsePayload(p.PayloadJson);
            return new
            {
                safehouseId = p.EntityId,
                name = safehouse?.Name ?? $"Safehouse {p.EntityId}",
                city = safehouse?.City,
                currentOccupancy = safehouse?.CurrentOccupancy,
                capacityGirls = safehouse?.CapacityGirls,
                predictedIncidentsNextMonth = ReadDecimal(payload.RootElement, "predicted_incidents_next_month") ?? p.Score,
                incidentsP10 = ReadDecimal(payload.RootElement, "incidents_p10"),
                incidentsP90 = ReadDecimal(payload.RootElement, "incidents_p90"),
                activeResidentsNext = ReadInt(payload.RootElement, "active_residents_next"),
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("resident-risk/top")]
    public async Task<ActionResult> GetTopResidentRisk([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "resident_incident_30d";

        var predictions = await GetLatestBatchAsync(predictionType, "Resident", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var residents = await LoadResidentsAsync(predictions);
        var items = predictions.Select(p =>
        {
            residents.TryGetValue(p.EntityId, out var resident);
            return new
            {
                residentId = p.EntityId,
                displayName = resident?.DisplayName ?? $"Resident {p.EntityId}",
                caseStatus = resident?.CaseStatus,
                caseCategory = resident?.CaseCategory,
                safehouseId = resident?.SafehouseId,
                assignedSocialWorker = resident?.AssignedSocialWorker,
                riskScore = p.Score,
                riskBand = p.Label,
                createdAtUtc = p.CreatedAtUtc
            };
        });

        return Ok(items);
    }

    [HttpGet("resident-readiness/top")]
    public async Task<ActionResult> GetTopResidentReadiness([FromQuery] int take = 25)
    {
        take = Math.Clamp(take, 1, 100);
        const string predictionType = "resident_reintegration_readiness";

        var predictions = await GetLatestBatchAsync(predictionType, "Resident", take);
        if (predictions.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var residents = await LoadResidentsAsync(predictions);
        var items = predictions.Select(p =>
        {
            residents.TryGetValue(p.EntityId, out var resident);
            using var payload = ParsePayload(p.PayloadJson);
            return new
            {
                residentId = p.EntityId,
                displayName = resident?.DisplayName ?? $"Resident {p.EntityId}",
                caseStatus = resident?.CaseStatus,
                safehouseId = resident?.SafehouseId,
                assignedSocialWorker = resident?.AssignedSocialWorker,
                readinessScore = ReadDecimal(payload.RootElement, "readiness_score") ?? p.Score,
                readinessBand = ReadString(payload.RootElement, "readiness_band") ?? p.Label,
                reintegrationType = ReadString(payload.RootElement, "reintegration_type") ?? resident?.ReintegrationType,
                createdAtUtc = p.CreatedAtUtc
            };
        });

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

    private async Task<DateTime?> GetLatestCreatedAtAsync(string predictionType, string? entityType = null)
    {
        var query = BuildCurrentPredictionQuery(predictionType, entityType);

        return await query.MaxAsync(x => (DateTime?)x.CreatedAtUtc);
    }

    private async Task<List<MlPrediction>> GetLatestBatchAsync(string predictionType, string entityType, int take)
    {
        return await BuildCurrentPredictionQuery(predictionType, entityType)
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.EntityId)
            .Take(take)
            .ToListAsync();
    }

    private IQueryable<MlPrediction> BuildCurrentPredictionQuery(string predictionType, string? entityType = null)
    {
        var scoped = db.MlPredictions.AsNoTracking()
            .Where(x => x.PredictionType == predictionType);

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            scoped = scoped.Where(x => x.EntityType == entityType);
        }

        var latestByEntity = scoped
            .GroupBy(x => new { x.EntityType, x.EntityId })
            .Select(g => new
            {
                g.Key.EntityType,
                g.Key.EntityId,
                CreatedAtUtc = g.Max(v => v.CreatedAtUtc)
            });

        return scoped.Join(
            latestByEntity,
            row => new { row.EntityType, row.EntityId, row.CreatedAtUtc },
            latest => new { latest.EntityType, latest.EntityId, latest.CreatedAtUtc },
            (row, _) => row
        );
    }

    private async Task<Dictionary<int, Supporter>> LoadSupportersAsync(IEnumerable<MlPrediction> predictions)
    {
        var ids = predictions.Select(x => x.EntityId).Distinct().ToList();
        return await db.Supporters.AsNoTracking()
            .Where(x => ids.Contains(x.SupporterId))
            .ToDictionaryAsync(x => x.SupporterId);
    }

    private async Task<Dictionary<int, Resident>> LoadResidentsAsync(IEnumerable<MlPrediction> predictions)
    {
        var ids = predictions.Select(x => x.EntityId).Distinct().ToList();
        return await db.Residents.AsNoTracking()
            .Where(x => ids.Contains(x.ResidentId))
            .ToDictionaryAsync(x => x.ResidentId);
    }

    private async Task<Dictionary<int, Safehouse>> LoadSafehousesAsync(IEnumerable<MlPrediction> predictions)
    {
        var ids = predictions.Select(x => x.EntityId).Distinct().ToList();
        return await db.Safehouses.AsNoTracking()
            .Where(x => ids.Contains(x.SafehouseId))
            .ToDictionaryAsync(x => x.SafehouseId);
    }

    private static JsonDocument ParsePayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return JsonDocument.Parse("{}");
        }

        try
        {
            return JsonDocument.Parse(payloadJson);
        }
        catch (JsonException)
        {
            return JsonDocument.Parse("{}");
        }
    }

    private static string? ReadString(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => null
        };
    }

    private static decimal? ReadDecimal(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number))
        {
            return number;
        }

        if (value.ValueKind == JsonValueKind.String
            && decimal.TryParse(value.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out number))
        {
            return number;
        }

        return null;
    }

    private static int? ReadInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        if (value.ValueKind == JsonValueKind.String
            && int.TryParse(value.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out number))
        {
            return number;
        }

        return null;
    }
}
