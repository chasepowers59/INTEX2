namespace Intex.Api.Diagnostics;

/// <summary>
/// Set once during startup (before <c>app.Run()</c>) so <c>/health/migrations</c> can report migrate failures.
/// </summary>
internal static class StartupMigrationDiagnostics
{
    public const string OutcomePending = "pending";
    public const string OutcomeOk = "ok";
    public const string OutcomeFailed = "failed";
    public const string OutcomeSkipped = "skipped";

    public static string Outcome { get; set; } = OutcomePending;

    /// <summary>Base exception message when <see cref="Outcome"/> is <see cref="OutcomeFailed"/>.</summary>
    public static string? ErrorMessage { get; set; }

    public static void SetFailed(Exception ex, int maxLen = 600)
    {
        Outcome = OutcomeFailed;
        var msg = ex.GetBaseException().Message;
        if (msg.Length > maxLen)
            msg = msg[..maxLen] + "…";
        ErrorMessage = msg;
    }
}
