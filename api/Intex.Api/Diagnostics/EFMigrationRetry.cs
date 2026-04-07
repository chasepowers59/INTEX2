using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Intex.Api.Diagnostics;

internal static class EFMigrationRetry
{
    private static readonly HashSet<int> TransientSqlNumbers =
    [
        64,
        233,
        601,
        615,
        916,
        922,
        40143,
        40197,
        40501,
        40613,
        40675,
        4221,
        42108,
        4220,
        49918,
        49919,
        49920,
        10053,
        10054,
        10060,
        10928,
        10929
    ];

    internal static bool IsTransientFailure(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException)
        {
            if (e is TimeoutException or OperationCanceledException)
                return false; // cancellation is not "retry same op" here

            if (e is SqlException sql)
            {
                if (TransientSqlNumbers.Contains(sql.Number))
                    return true;

                var msg = sql.Message;
                if (msg.Contains("not currently available", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (msg.Contains("Please retry the connection later", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (msg.Contains("transient failure", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (msg.Contains("service is currently busy", StringComparison.OrdinalIgnoreCase))
                    return true;
            }
        }

        var rootMsg = ex.GetBaseException().Message;
        return rootMsg.Contains("not currently available", StringComparison.OrdinalIgnoreCase)
            || rootMsg.Contains("Please retry the connection later", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Runs <see cref="DatabaseFacade.MigrateAsync(System.Threading.CancellationToken)"/> with backoff for Azure SQL cold start / throttling.
    /// </summary>
    internal static async Task<(bool success, Exception? error)> TryMigrateAsync(
        DatabaseFacade database,
        ILogger logger,
        int maxAttempts = 7,
        CancellationToken cancellationToken = default)
    {
        Exception? last = null;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                await database.MigrateAsync(cancellationToken).ConfigureAwait(false);
                return (true, null);
            }
            catch (Exception ex)
            {
                last = ex;
                if (attempt >= maxAttempts || !IsTransientFailure(ex))
                {
                    return (false, ex);
                }

                var seconds = Math.Min(60, Math.Pow(2, attempt)); // 2,4,8,16,32,60,60
                var delay = TimeSpan.FromSeconds(seconds);
                logger.LogWarning(
                    ex,
                    "MigrateAsync hit a transient SQL error (attempt {Attempt}/{Max}). Retrying in {DelaySeconds:0.#}s.",
                    attempt,
                    maxAttempts,
                    delay.TotalSeconds);
                try
                {
                    await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
            }
        }

        return (false, last);
    }
}
