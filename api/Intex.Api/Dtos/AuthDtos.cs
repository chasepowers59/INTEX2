namespace Intex.Api.Dtos;

public sealed record LoginRequest(string? Username, string? Email, string? Password);

public sealed record LoginResponse(
    string AccessToken,
    string Username,
    string DisplayName,
    string[] Roles
);

public sealed record MeResponse(
    string Username,
    string DisplayName,
    string[] Roles
);

/// <summary>Public self-service donor signup: creates a supporter row (or links by email) + Identity user with Donor role.</summary>
public sealed record DonorRegisterRequest(
    string Email,
    string Password,
    string? DisplayName,
    string? FirstName,
    string? LastName,
    string? Phone,
    string? OrganizationName
);

