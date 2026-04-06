namespace Intex.Api.Dtos;

public sealed record PagedResult<T>(
    int Page,
    int PageSize,
    int Total,
    IReadOnlyList<T> Items
);

