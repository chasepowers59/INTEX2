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
    ILogger<AuthController> logger
) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await userManager.FindByNameAsync(request.Username)
                   ?? await userManager.FindByEmailAsync(request.Username);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var roles = await userManager.GetRolesAsync(user);
        return TryIssueToken(user, roles);
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

