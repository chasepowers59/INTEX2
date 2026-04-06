namespace Intex.Api.Data;

/// <summary>
/// Optional extra seed accounts from configuration section <c>Seed:Accounts</c> (e.g. local appsettings.Development.json).
/// </summary>
public sealed class SeedAccountBinding
{
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? DisplayName { get; set; }
    public string? Role { get; set; }
}
