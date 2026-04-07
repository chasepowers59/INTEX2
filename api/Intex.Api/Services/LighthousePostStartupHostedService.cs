using Intex.Api.Data;
using Intex.Api.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Services;

/// <summary>
/// When <c>LighthouseImport:SyncBeforeSeed</c> is <see langword="false"/>, runs Lighthouse CSV import after the server listens
/// (avoids long startup / HTTP 503 on Azure). When <see langword="true"/> (default), import runs in <c>Program.cs</c> before seed;
/// this service only reconciles migration diagnostics.
/// </summary>
public sealed class LighthousePostStartupHostedService(
    IServiceProvider services,
    IConfiguration configuration,
    ILogger<LighthousePostStartupHostedService> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(300), stoppingToken).ConfigureAwait(false);

        var hadStaleStartupFailure = StartupMigrationDiagnostics.Outcome == StartupMigrationDiagnostics.OutcomeFailed;
        await using (var reconcileScope = services.CreateAsyncScope())
        {
            try
            {
                var db = reconcileScope.ServiceProvider.GetRequiredService<AppDbContext>();
                if (await db.Database.CanConnectAsync(stoppingToken).ConfigureAwait(false))
                {
                    var pending = await db.Database.GetPendingMigrationsAsync(stoppingToken).ConfigureAwait(false);
                    StartupMigrationDiagnostics.ReconcileStaleFailureIfNoPendingMigrations(pending.Count());
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not reconcile EF migration diagnostics before Lighthouse CSV import.");
            }
        }

        if (hadStaleStartupFailure && StartupMigrationDiagnostics.Outcome == StartupMigrationDiagnostics.OutcomeOk)
        {
            logger.LogInformation(
                "Cleared stale startup migration failure: live database reports no pending EF migrations (common after a transient Azure SQL cold start).");
        }

        if (StartupMigrationDiagnostics.Outcome == StartupMigrationDiagnostics.OutcomeFailed)
        {
            logger.LogInformation("Skipping Lighthouse CSV post-startup import: EF migrations did not succeed.");
            return;
        }

        if (!configuration.GetValue("LighthouseImport:AutoImportIfEmpty", true))
        {
            return;
        }

        if (configuration.GetValue("LighthouseImport:SyncBeforeSeed", true))
        {
            return;
        }

        try
        {
            var ran = await LighthouseStartupImport
                .TryAutoImportIfEmptyAsync(services, configuration, logger, stoppingToken)
                .ConfigureAwait(false);

            // Import (replace) clears operational rows and nulls AspNetUsers.SupporterId — run seed again to re-link donor demo, etc.
            if (ran)
            {
                await SeedData.EnsureSeededAsync(services, configuration).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // shutdown
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lighthouse post-startup CSV import or follow-up seed failed.");
        }
    }
}
