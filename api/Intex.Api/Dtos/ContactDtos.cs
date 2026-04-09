namespace Intex.Api.Dtos;

public sealed record ContactRequest(
    string? Name,
    string? Email,
    string? InquiryType,
    string? Message
);

public sealed record ContactResponse(
    string Message,
    string ReferenceId
);
