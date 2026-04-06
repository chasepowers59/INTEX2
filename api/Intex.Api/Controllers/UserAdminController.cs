using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class UserAdminController(
    UserManager<AppUser> userManager,
    RoleManager<IdentityRole> roleManager,
    AppDbContext db
) : ControllerBase
{
    [HttpGet("roles")]
    public ActionResult<IReadOnlyList<string>> GetRoles()
        => Ok(new[] { AppRoles.Admin, AppRoles.Employee, AppRoles.Donor });

    [HttpPost("create")]
    public async Task<ActionResult> Create([FromBody] CreateUserRequest req)
    {
        var role = req.Role?.Trim();
        if (string.IsNullOrWhiteSpace(role)) return BadRequest(new { message = "Role is required." });

        if (!await roleManager.RoleExistsAsync(role))
        {
            return BadRequest(new { message = $"Unknown role: {role}" });
        }

        if (req.SupporterId.HasValue)
        {
            var exists = await db.Supporters.AsNoTracking().AnyAsync(x => x.SupporterId == req.SupporterId.Value);
            if (!exists) return BadRequest(new { message = "SupporterId not found." });
        }

        var email = req.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null) return BadRequest(new { message = "User already exists." });

        user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = req.DisplayName?.Trim(),
            SupporterId = req.SupporterId
        };

        var created = await userManager.CreateAsync(user, req.Password);
        if (!created.Succeeded)
        {
            var msg = string.Join("; ", created.Errors.Select(e => $"{e.Code}:{e.Description}"));
            return BadRequest(new { message = msg });
        }

        await userManager.AddToRoleAsync(user, role);
        return Ok(new { email, role, supporterId = req.SupporterId });
    }

    [HttpPost("link-donor")]
    public async Task<ActionResult> LinkDonor([FromBody] LinkDonorRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email.Trim());
        if (user is null) return NotFound(new { message = "User not found." });

        var exists = await db.Supporters.AsNoTracking().AnyAsync(x => x.SupporterId == req.SupporterId);
        if (!exists) return BadRequest(new { message = "SupporterId not found." });

        user.SupporterId = req.SupporterId;
        await userManager.UpdateAsync(user);

        if (!await userManager.IsInRoleAsync(user, AppRoles.Donor))
        {
            await userManager.AddToRoleAsync(user, AppRoles.Donor);
        }

        return Ok(new { email = user.Email, supporterId = user.SupporterId, role = AppRoles.Donor });
    }
}

