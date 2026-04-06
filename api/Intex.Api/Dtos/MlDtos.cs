namespace Intex.Api.Dtos;

public sealed record MlPredictionImportItem(
    string PredictionType,
    string EntityType,
    int EntityId,
    decimal Score,
    string? Label,
    string? PayloadJson
);

