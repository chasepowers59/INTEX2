namespace Intex.Api.Dtos;

public sealed record LoginRequest(string Username, string Password);

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

