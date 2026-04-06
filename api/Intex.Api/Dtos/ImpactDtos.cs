namespace Intex.Api.Dtos;

public sealed record ImpactAllocationCreateRequest(
    int SupporterId,
    int? SnapshotId,
    DateOnly AllocationDate,
    string Category,
    decimal Amount,
    string Currency,
    string? Notes
);

public sealed record ImpactAllocationUpdateRequest(
    int ImpactAllocationId,
    int SupporterId,
    int? SnapshotId,
    DateOnly AllocationDate,
    string Category,
    decimal Amount,
    string Currency,
    string? Notes
);

