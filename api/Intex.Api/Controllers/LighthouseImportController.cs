using Intex.Api.Auth;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/admin/lighthouse-import")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class LighthouseImportController(LighthouseCsvImportService importer) : ControllerBase
{
    public sealed record ImportRequest(string? SourceDirectory, bool Replace = false);

    /// <summary>
    /// Load INTEX Lighthouse CSVs from disk into Azure SQL. Use <paramref name="Replace"/> to wipe operational tables first (not Identity).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult> Import([FromBody] ImportRequest req, CancellationToken ct)
    {
        var result = await importer.ImportAsync(req.SourceDirectory, req.Replace, ct);
        if (!result.Ok)
        {
            return BadRequest(new { message = result.Error, log = result.Log });
        }

        return Ok(new { message = "Import finished.", log = result.Log });
    }
}
