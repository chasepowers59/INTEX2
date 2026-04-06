namespace Intex.Api.Auth;

public sealed class JwtOptions
{
    public string Key { get; init; } = "";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public int ExpiresMinutes { get; init; } = 120;
}

