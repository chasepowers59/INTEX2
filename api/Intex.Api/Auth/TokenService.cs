using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Intex.Api.Data;

namespace Intex.Api.Auth;

public sealed class TokenService(IOptions<JwtOptions> jwtOptions)
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public string CreateToken(AppUser user, IList<string> roles)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_jwt.Key ?? "");
        if (keyBytes.Length < 32)
        {
            throw new InvalidOperationException(
                "Jwt:Key must be at least 32 UTF-8 bytes for HMAC-SHA256. Without it, login succeeds in Identity then fails when signing the JWT (HTTP 500). " +
                "Set Jwt__Key on the host (e.g. Azure App Settings) or Jwt:Key in appsettings.Development.json.");
        }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName ?? ""),
            new("name", user.DisplayName ?? user.UserName ?? "User")
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }
        var signingKey = new SymmetricSecurityKey(keyBytes);
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

