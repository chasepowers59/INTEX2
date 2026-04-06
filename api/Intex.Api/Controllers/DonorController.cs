using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donor")]
[Authorize(Roles = AppRoles.Donor)]
public sealed class DonorController(AppDbContext db, Microsoft.AspNetCore.Identity.UserManager<AppUser> userManager) : ControllerBase
{
    [HttpGet("contributions")]
    public async Task<ActionResult<PagedResult<object>>> MyContributions([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var userId = userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var user = await userManager.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null || user.SupporterId is null) return Ok(new PagedResult<object>(page, pageSize, 0, []));

        var query = db.Contributions.AsNoTracking()
            .Where(x => x.SupporterId == user.SupporterId.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.ContributionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.ContributionId,
                x.ContributionType,
                x.Amount,
                x.Currency,
                x.ContributionDate,
                x.CampaignName,
                x.Notes
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(page, pageSize, total, items));
    }
}

