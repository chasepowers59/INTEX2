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

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? q = null, [FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 200);
        q = string.IsNullOrWhiteSpace(q) ? null : q.Trim();

        var query = userManager.Users.AsNoTracking();
        if (q is not null)
        {
            query = query.Where(u =>
                (u.Email != null && u.Email.Contains(q)) ||
                (u.UserName != null && u.UserName.Contains(q)) ||
                (u.DisplayName != null && u.DisplayName.Contains(q)));
        }

        var users = await query
            .OrderBy(u => u.Email)
            .Take(take)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.UserName,
                u.DisplayName,
                u.SupporterId,
                u.LockoutEnd
            })
            .ToListAsync();

        var withRoles = new List<object>(users.Count);
        foreach (var u in users)
        {
            var user = await userManager.FindByIdAsync(u.Id);
            var roles = user is null ? Array.Empty<string>() : (await userManager.GetRolesAsync(user)).ToArray();
            withRoles.Add(new
            {
                u.Id,
                u.Email,
                u.UserName,
                u.DisplayName,
                u.SupporterId,
                u.LockoutEnd,
                roles
            });
        }

        return Ok(new { items = withRoles });
    }

    public sealed record UpdateUserRequest(
        string Id,
        string Email,
        string? DisplayName,
        string Role,
        int? SupporterId
    );

    [HttpPut("{id}")]
    public async Task<ActionResult> Update([FromRoute] string id, [FromBody] UpdateUserRequest req)
    {
        if (!string.Equals(id, req.Id, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "User ID mismatch." });
        }

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var email = req.Email.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        var role = req.Role?.Trim();
        if (string.IsNullOrWhiteSpace(role))
        {
            return BadRequest(new { message = "Role is required." });
        }

        if (!await roleManager.RoleExistsAsync(role))
        {
            return BadRequest(new { message = $"Unknown role: {role}" });
        }

        if (req.SupporterId.HasValue)
        {
            var exists = await db.Supporters.AsNoTracking().AnyAsync(x => x.SupporterId == req.SupporterId.Value);
            if (!exists) return BadRequest(new { message = "SupporterId not found." });
        }

        if (string.Equals(role, AppRoles.Admin, StringComparison.OrdinalIgnoreCase) && req.SupporterId.HasValue)
        {
            return BadRequest(new { message = "Admin accounts should not be linked to supporter records." });
        }

        var emailOwner = await userManager.FindByEmailAsync(email);
        if (emailOwner is not null && !string.Equals(emailOwner.Id, user.Id, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Another user already has this email." });
        }

        user.Email = email;
        user.UserName = email;
        user.DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? null : req.DisplayName.Trim();
        user.SupporterId = req.SupporterId;

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            var msg = string.Join("; ", updateResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
            return BadRequest(new { message = msg });
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            var removeResult = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
            {
                var msg = string.Join("; ", removeResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
                return BadRequest(new { message = msg });
            }
        }

        var addRoleResult = await userManager.AddToRoleAsync(user, role);
        if (!addRoleResult.Succeeded)
        {
            var msg = string.Join("; ", addRoleResult.Errors.Select(e => $"{e.Code}:{e.Description}"));
            return BadRequest(new { message = msg });
        }

        return Ok(new
        {
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            user.SupporterId,
            roles = new[] { role }
        });
    }

    public sealed record SetUserEnabledRequest(string Email, bool Enabled);

    [HttpPost("set-enabled")]
    public async Task<ActionResult> SetEnabled([FromBody] SetUserEnabledRequest req)
    {
        var email = req.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);
        if (user is null) return NotFound(new { message = "User not found." });

        user.LockoutEnabled = true;
        user.LockoutEnd = req.Enabled ? null : DateTimeOffset.UtcNow.AddYears(100);
        await userManager.UpdateAsync(user);
        return Ok(new { email, enabled = req.Enabled });
    }

    public sealed record ResetPasswordRequest(string Email, string NewPassword);

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var email = req.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);
        if (user is null) return NotFound(new { message = "User not found." });

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var res = await userManager.ResetPasswordAsync(user, token, req.NewPassword);
        if (!res.Succeeded)
        {
            var msg = string.Join("; ", res.Errors.Select(e => $"{e.Code}:{e.Description}"));
            return BadRequest(new { message = msg });
        }

        return Ok(new { email });
    }

    [HttpPost("link-donor")]
    public async Task<ActionResult> LinkDonor([FromBody] LinkDonorRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email.Trim());
        if (user is null) return NotFound(new { message = "User not found." });

        if (await userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            return BadRequest(new { message = "Do not attach SupporterId to Admin accounts; create or use a donor account for supporter-linked access." });
        }

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

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete([FromRoute] string id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Deletion requires confirm=true." });
        }

        var currentUserId = userManager.GetUserId(User);
        if (string.Equals(currentUserId, id, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "You cannot delete your own account." });
        }

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var msg = string.Join("; ", result.Errors.Select(e => $"{e.Code}:{e.Description}"));
            return BadRequest(new { message = msg });
        }

        return Ok(new { id, email = user.Email });
    }
}
