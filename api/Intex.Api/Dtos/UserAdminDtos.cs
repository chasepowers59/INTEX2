namespace Intex.Api.Dtos;

public sealed record CreateUserRequest(
    string Email,
    string Password,
    string DisplayName,
    string Role,
    int? SupporterId
);

public sealed record LinkDonorRequest(
    string Email,
    int SupporterId
);

