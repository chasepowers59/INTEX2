using System.Data.Common;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    TokenService tokenService,
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<AuthController> logger
) : ControllerBase
{
    private const string TwoFactorIssuer = "Steps of Hope";
    private const string GitHubProvider = "GitHub";
    private const string GitHubStateCookie = "gh_oauth_state";
    private const string GitHubReturnCookie = "gh_oauth_return";

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var loginId = (request.Username ?? request.Email ?? "").Trim();
            if (loginId.Length == 0 || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { message = "Email (or username) and password are required." });
            }

            var user = await userManager.FindByNameAsync(loginId)
                       ?? await userManager.FindByEmailAsync(loginId);

            if (user is null)
            {
                if (!await userManager.Users.AnyAsync())
                {
                    return Unauthorized(new
                    {
                        message =
                            "No accounts exist in this database yet. In Azure App Service set Seed__AdminEmail and Seed__AdminPassword (12+ characters with upper, lower, digit, and a symbol), restart the API, then sign in with that email. Or use donor registration."
                    });
                }

                return Unauthorized(new { message = "Invalid username or password." });
            }

            var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
            if (result.IsLockedOut)
            {
                return Unauthorized(new
                {
                    message =
                        "This account is temporarily locked after failed sign-in attempts. Wait about 10 minutes, or set Seed__ClearLockouts to true for one API restart (seeded accounts), then try again."
                });
            }

            if (result.IsNotAllowed)
            {
                return Unauthorized(new { message = "Sign-in is not allowed for this account." });
            }

            if (!result.Succeeded)
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            var roles = await userManager.GetRolesAsync(user);
            return TryIssueToken(user, roles);
        }
        catch (DbException ex)
        {
            logger.LogError(ex, "Database error during login (often missing EF migrations / AspNet* tables).");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    message =
                        "Database error while signing in. Open GET /health/migrations — if \"pending\" is not empty, apply migrations to this database (dotnet ef database update). Also check GET /health/schema.",
                    traceId = HttpContext.TraceIdentifier
                });
        }
    }

    [HttpGet("mfa/status")]
    [Authorize]
    public async Task<ActionResult> GetMfaStatus()
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        var key = await userManager.GetAuthenticatorKeyAsync(user);
        return Ok(new
        {
            enabled = user.TwoFactorEnabled,
            hasSharedKey = !string.IsNullOrWhiteSpace(key)
        });
    }

    [HttpGet("github/start")]
    [AllowAnonymous]
    public ActionResult StartGitHub([FromQuery] string? returnUrl = null)
    {
        var clientId = configuration["ExternalAuth:GitHub:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return BadRequest(new { message = "GitHub OAuth is not configured (missing ExternalAuth:GitHub:ClientId)." });
        }

        var callbackUrl = configuration["ExternalAuth:GitHub:CallbackUrl"];
        if (string.IsNullOrWhiteSpace(callbackUrl))
        {
            callbackUrl = $"{Request.Scheme}://{Request.Host}/api/auth/github/callback";
        }

        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        Response.Cookies.Append(GitHubStateCookie, state, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10),
            Path = "/"
        });

        if (!string.IsNullOrWhiteSpace(returnUrl))
        {
            Response.Cookies.Append(GitHubReturnCookie, returnUrl, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddMinutes(10),
                Path = "/"
            });
        }

        var authUrl =
            $"https://github.com/login/oauth/authorize?client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(callbackUrl)}&scope={Uri.EscapeDataString("read:user user:email")}&state={Uri.EscapeDataString(state)}";
        return Redirect(authUrl);
    }

    [HttpGet("github/callback")]
    [AllowAnonymous]
    public async Task<ActionResult> GitHubCallback([FromQuery] string? code, [FromQuery] string? state)
    {
        var expectedState = Request.Cookies[GitHubStateCookie];
        var returnUrl = Request.Cookies[GitHubReturnCookie];
        Response.Cookies.Delete(GitHubStateCookie);
        Response.Cookies.Delete(GitHubReturnCookie);

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || expectedState != state)
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in failed: invalid OAuth state."));
        }

        var clientId = configuration["ExternalAuth:GitHub:ClientId"];
        var clientSecret = configuration["ExternalAuth:GitHub:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in is not configured on the server."));
        }

        var callbackUrl = configuration["ExternalAuth:GitHub:CallbackUrl"];
        if (string.IsNullOrWhiteSpace(callbackUrl))
        {
            callbackUrl = $"{Request.Scheme}://{Request.Host}/api/auth/github/callback";
        }

        var tokenClient = httpClientFactory.CreateClient();
        tokenClient.DefaultRequestHeaders.Accept.Clear();
        tokenClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        tokenClient.DefaultRequestHeaders.UserAgent.ParseAdd("StepsOfHope-OAuth");

        var tokenResp = await tokenClient.PostAsync(
            "https://github.com/login/oauth/access_token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["code"] = code,
                ["redirect_uri"] = callbackUrl
            }));
        if (!tokenResp.IsSuccessStatusCode)
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in failed while exchanging token."));
        }

        var tokenJson = await tokenResp.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<GitHubTokenResponse>(tokenJson);
        if (tokenData is null || string.IsNullOrWhiteSpace(tokenData.access_token))
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in failed: missing access token."));
        }

        var githubClient = httpClientFactory.CreateClient();
        githubClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenData.access_token);
        githubClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        githubClient.DefaultRequestHeaders.UserAgent.ParseAdd("StepsOfHope-OAuth");

        var userResp = await githubClient.GetAsync("https://api.github.com/user");
        if (!userResp.IsSuccessStatusCode)
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in failed while loading user profile."));
        }

        var userJson = await userResp.Content.ReadAsStringAsync();
        var ghUser = JsonSerializer.Deserialize<GitHubUserResponse>(userJson);
        if (ghUser is null || string.IsNullOrWhiteSpace(ghUser.id))
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub sign-in failed: invalid profile payload."));
        }

        string? email = ghUser.email;
        if (string.IsNullOrWhiteSpace(email))
        {
            var emailResp = await githubClient.GetAsync("https://api.github.com/user/emails");
            if (emailResp.IsSuccessStatusCode)
            {
                var emailJson = await emailResp.Content.ReadAsStringAsync();
                var emails = JsonSerializer.Deserialize<List<GitHubEmailResponse>>(emailJson) ?? [];
                email = emails.FirstOrDefault(x => x.primary && x.verified)?.email
                        ?? emails.FirstOrDefault(x => x.verified)?.email
                        ?? emails.FirstOrDefault()?.email;
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return Redirect(BuildExternalRedirect(returnUrl, null, "GitHub account does not expose a usable email."));
        }

        var user = await userManager.FindByLoginAsync(GitHubProvider, ghUser.id);
        if (user is null)
        {
            user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new AppUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    DisplayName = string.IsNullOrWhiteSpace(ghUser.name) ? (ghUser.login ?? email) : ghUser.name
                };
                var create = await userManager.CreateAsync(user);
                if (!create.Succeeded)
                {
                    return Redirect(BuildExternalRedirect(returnUrl, null, JoinIdentityErrors(create)));
                }
            }

            var addLogin = await userManager.AddLoginAsync(user, new UserLoginInfo(GitHubProvider, ghUser.id, GitHubProvider));
            if (!addLogin.Succeeded && addLogin.Errors.All(e => e.Code != "LoginAlreadyAssociated"))
            {
                return Redirect(BuildExternalRedirect(returnUrl, null, JoinIdentityErrors(addLogin)));
            }
        }

        var roles = await userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            var addRole = await userManager.AddToRoleAsync(user, AppRoles.Donor);
            if (!addRole.Succeeded)
            {
                return Redirect(BuildExternalRedirect(returnUrl, null, JoinIdentityErrors(addRole)));
            }
            roles = await userManager.GetRolesAsync(user);
        }

        string token;
        try
        {
            token = tokenService.CreateToken(user, roles);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "JWT issuance failed after GitHub callback.");
            return Redirect(BuildExternalRedirect(returnUrl, null, "Sign-in failed while issuing app token."));
        }

        return Redirect(BuildExternalRedirect(returnUrl, token, null));
    }

    [HttpPost("mfa/setup")]
    [Authorize]
    public async Task<ActionResult> SetupMfa()
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (!user.TwoFactorEnabled)
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
        }

        var sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(sharedKey))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
        }

        if (string.IsNullOrWhiteSpace(sharedKey))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Could not generate an authenticator key." });
        }

        var email = user.Email ?? user.UserName ?? "user";
        return Ok(new
        {
            enabled = user.TwoFactorEnabled,
            sharedKey,
            manualEntryKey = FormatKey(sharedKey),
            otpauthUri = BuildOtpAuthUri(email, sharedKey)
        });
    }

    [HttpPost("mfa/enable")]
    [Authorize]
    public async Task<ActionResult> EnableMfa([FromBody] EnableTwoFactorRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        var code = NormalizeTwoFactorCode(request.Code);
        if (code is null)
        {
            return BadRequest(new { message = "A valid 6-digit authenticator code is required." });
        }

        var valid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            TokenOptions.DefaultAuthenticatorProvider,
            code);

        if (!valid)
        {
            return BadRequest(new { message = "Authenticator code is invalid." });
        }

        var setResult = await userManager.SetTwoFactorEnabledAsync(user, true);
        if (!setResult.Succeeded)
        {
            return BadRequest(new { message = JoinIdentityErrors(setResult) });
        }

        await userManager.UpdateSecurityStampAsync(user);
        return Ok(new { enabled = true, message = "Multi-factor authentication enabled." });
    }

    [HttpPost("mfa/disable")]
    [Authorize]
    public async Task<ActionResult> DisableMfa([FromBody] DisableTwoFactorRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Current password is required." });
        }

        var passwordOk = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordOk)
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        var code = NormalizeTwoFactorCode(request.Code);
        if (code is null)
        {
            return BadRequest(new { message = "A valid 6-digit authenticator code is required." });
        }

        var valid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            TokenOptions.DefaultAuthenticatorProvider,
            code);

        if (!valid)
        {
            return BadRequest(new { message = "Authenticator code is invalid." });
        }

        var disableResult = await userManager.SetTwoFactorEnabledAsync(user, false);
        if (!disableResult.Succeeded)
        {
            return BadRequest(new { message = JoinIdentityErrors(disableResult) });
        }

        await userManager.UpdateSecurityStampAsync(user);
        return Ok(new { enabled = false, message = "Multi-factor authentication disabled." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeResponse>> Me()
    {
        var userId = userManager.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new MeResponse(
            Username: user.UserName ?? "",
            DisplayName: user.DisplayName ?? user.UserName ?? "User",
            Roles: roles.ToArray()
        ));
    }

    /// <summary>
    /// Creates a donor login and a <see cref="Supporter"/> row, or links to an existing supporter when the email matches
    /// imported Lighthouse data (same <c>supporters.email</c>).
    /// </summary>
    [HttpPost("register-donor")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> RegisterDonor([FromBody] DonorRegisterRequest req, CancellationToken ct)
    {
        var email = req.Email?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        var display = BuildDisplayName(req);
        if (string.IsNullOrWhiteSpace(display))
        {
            return BadRequest(new { message = "Provide a display name, or both first and last name." });
        }

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return BadRequest(new { message = "An account with this email already exists. Sign in instead." });
        }

        var emailLower = email.ToLowerInvariant();
        var existingSupporter = await db.Supporters
            .Where(x => x.Email != null && x.Email.ToLower() == emailLower)
            .OrderBy(x => x.SupporterId)
            .FirstOrDefaultAsync(ct);

        var createdNewSupporter = false;
        Supporter supporter;

        if (existingSupporter is not null)
        {
            supporter = existingSupporter;
            var linked = await userManager.Users.AnyAsync(u => u.SupporterId == supporter.SupporterId, ct);
            if (linked)
            {
                return BadRequest(new
                {
                    message = "This supporter email is already linked to a donor login. Sign in or use password recovery if available."
                });
            }
        }
        else
        {
            supporter = new Supporter
            {
                SupporterType = "MonetaryDonor",
                DisplayName = display.Trim(),
                FullName = display.Trim(),
                FirstName = string.IsNullOrWhiteSpace(req.FirstName) ? null : req.FirstName.Trim(),
                LastName = string.IsNullOrWhiteSpace(req.LastName) ? null : req.LastName.Trim(),
                OrganizationName = string.IsNullOrWhiteSpace(req.OrganizationName) ? null : req.OrganizationName.Trim(),
                Email = email,
                Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Status = "Active",
                IsActive = true,
                AcquisitionChannel = "Website",
                RelationshipType = "Local",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Supporters.Add(supporter);
            await db.SaveChangesAsync(ct);
            createdNewSupporter = true;
        }

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = display.Trim(),
            SupporterId = supporter.SupporterId
        };

        var created = await userManager.CreateAsync(user, req.Password);
        if (!created.Succeeded)
        {
            if (createdNewSupporter)
            {
                db.Supporters.Remove(supporter);
                await db.SaveChangesAsync(ct);
            }

            var msg = string.Join("; ", created.Errors.Select(e => $"{e.Code}: {e.Description}"));
            return BadRequest(new { message = msg });
        }

        var roleAdd = await userManager.AddToRoleAsync(user, AppRoles.Donor);
        if (!roleAdd.Succeeded)
        {
            await userManager.DeleteAsync(user);
            if (createdNewSupporter)
            {
                db.Supporters.Remove(supporter);
                await db.SaveChangesAsync(ct);
            }

            var rmsg = string.Join("; ", roleAdd.Errors.Select(e => $"{e.Code}: {e.Description}"));
            return BadRequest(new { message = rmsg });
        }

        var roles = await userManager.GetRolesAsync(user);
        return TryIssueToken(user, roles);
    }

    /// <summary>
    /// Missing/short <c>Jwt__Key</c> on Azure throws during signing; return 503 + message instead of opaque HTTP 500.
    /// </summary>
    private ActionResult<LoginResponse> TryIssueToken(AppUser user, IList<string> roles)
    {
        try
        {
            var token = tokenService.CreateToken(user, roles);
            return Ok(new LoginResponse(
                AccessToken: token,
                Username: user.UserName ?? "",
                DisplayName: user.DisplayName ?? user.UserName ?? "User",
                Roles: roles.ToArray()
            ));
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "JWT token issuance failed (configuration).");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    message =
                        ex.Message
                        + " In Azure: App Service → Environment variables → add Jwt__Key (32+ random characters)."
                });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            // e.g. IDX10720 signing key too short from identity model when Jwt:Key slips through too small
            logger.LogWarning(ex, "JWT token issuance failed (signing key size).");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    message =
                        "JWT signing key is too short. Set Jwt__Key in Azure Application Settings to at least 32 random UTF-8 characters."
                });
        }
    }

    private async Task<AppUser?> GetCurrentUserAsync()
    {
        var userId = userManager.GetUserId(User);
        return userId is null ? null : await userManager.FindByIdAsync(userId);
    }

    private static string? NormalizeTwoFactorCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var normalized = new string(code.Where(char.IsDigit).ToArray());
        return normalized.Length == 6 ? normalized : null;
    }

    private static string FormatKey(string rawKey)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < rawKey.Length; i++)
        {
            if (i > 0 && i % 4 == 0)
            {
                sb.Append(' ');
            }

            sb.Append(char.ToUpperInvariant(rawKey[i]));
        }

        return sb.ToString();
    }

    private static string BuildOtpAuthUri(string email, string sharedKey)
    {
        var issuer = Uri.EscapeDataString(TwoFactorIssuer);
        var account = Uri.EscapeDataString($"{TwoFactorIssuer}:{email}");
        return $"otpauth://totp/{account}?secret={sharedKey}&issuer={issuer}&digits=6";
    }

    private string BuildExternalRedirect(string? returnUrl, string? externalToken, string? externalError)
    {
        var fallback = configuration["ExternalAuth:FrontendBaseUrl"];
        if (string.IsNullOrWhiteSpace(fallback))
        {
            fallback = "http://localhost:5173";
        }

        var baseUrl = string.IsNullOrWhiteSpace(returnUrl) ? fallback : returnUrl;
        var uri = new Uri(baseUrl, UriKind.Absolute);
        var loginUrl = $"{uri.Scheme}://{uri.Authority}/login";

        var query = new List<string>();
        if (!string.IsNullOrWhiteSpace(externalToken))
        {
            query.Add($"externalToken={Uri.EscapeDataString(externalToken)}");
        }
        if (!string.IsNullOrWhiteSpace(externalError))
        {
            query.Add($"externalError={Uri.EscapeDataString(externalError)}");
        }

        return query.Count == 0 ? loginUrl : $"{loginUrl}?{string.Join("&", query)}";
    }

    private static string JoinIdentityErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(e => $"{e.Code}: {e.Description}"));

    private sealed record GitHubTokenResponse(string? access_token, string? token_type, string? scope);

    private sealed record GitHubUserResponse(string id, string? login, string? name, string? email);

    private sealed record GitHubEmailResponse(string email, bool primary, bool verified);

    private static string? BuildDisplayName(DonorRegisterRequest req)
    {
        if (!string.IsNullOrWhiteSpace(req.DisplayName))
        {
            return req.DisplayName.Trim();
        }

        var fn = req.FirstName?.Trim() ?? "";
        var ln = req.LastName?.Trim() ?? "";
        if (fn.Length > 0 && ln.Length > 0)
        {
            return $"{fn} {ln}";
        }

        return fn.Length > 0 ? fn : ln.Length > 0 ? ln : null;
    }
}

