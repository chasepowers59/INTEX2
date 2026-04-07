using Intex.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Services;

/// <summary>
/// One-time style CSV load on startup when operational tables are empty (bundled <c>LighthouseSeedCsv</c> or configured directory).
/// </summary>
public static class LighthouseStartupImport
{
    /// <returns><see langword="true"/> when an import actually ran.</returns>
    public static async Task<bool> TryAutoImportIfEmptyAsync(
        IServiceProvider services,
        IConfiguration config,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!config.GetValue("LighthouseImport:AutoImportIfEmpty", true))
        {
            logger.LogInformation("LighthouseImport:AutoImportIfEmpty is false; skipping CSV auto-import.");
            return false;
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken))
            {
                logger.LogWarning("Lighthouse CSV auto-import skipped: cannot connect to database.");
                return false;
            }

            if (await db.Supporters.AnyAsync(cancellationToken))
            {
                logger.LogInformation("Lighthouse CSV auto-import skipped: Supporters table already has rows.");
                return false;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Lighthouse CSV auto-import skipped: could not verify empty Supporters table.");
            return false;
        }

        // Replace clears operational tables (not Identity) so we don't fail on duplicate PKs when DemoData
        // safehouses existed but Supporters was still empty — then loads bundled/configured CSVs in FK-safe order.
        var importer = scope.ServiceProvider.GetRequiredService<LighthouseCsvImportService>();
        logger.LogInformation(
            "Lighthouse CSV auto-import starting (replace mode: no supporters in DB). Identity users are preserved; AspNetUsers.SupporterId is nulled during import.");
        var result = await importer.ImportAsync(sourceDirectory: null, replace: true, cancellationToken);
        if (!result.Ok)
        {
            logger.LogWarning(
                "Lighthouse CSV auto-import failed: {Error}. Ensure CSVs exist under LighthouseSeedCsv/lighthouse_csv_v7 or set LighthouseImport:SourceDirectory.",
                result.Error);
            return false;
        }

        logger.LogInformation("Lighthouse CSV auto-import completed. {Summary}", string.Join(" | ", result.Log.Take(15)));
        return true;
    }
}
