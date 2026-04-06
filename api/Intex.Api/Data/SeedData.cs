using Intex.Api.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Intex.Api.Data;

public static class SeedData
{
    public static async Task EnsureSeededAsync(IServiceProvider services, IConfiguration config)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SeedData");
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Prefer migrations, but allow running without them (fast competition setup).
        try
        {
            await db.Database.MigrateAsync();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("migration", StringComparison.OrdinalIgnoreCase))
        {
            await db.Database.EnsureCreatedAsync();
        }

        await EnsureSchemaAsync(db);

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { AppRoles.Admin, AppRoles.Employee, AppRoles.Donor })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var syncPasswords = config.GetValue("Seed:SyncPasswords", false);
        var clearLockouts = config.GetValue("Seed:ClearLockouts", false);

        if (syncPasswords)
        {
            logger.LogWarning(
                "Seed:SyncPasswords is enabled: existing seeded users will have passwords overwritten from configuration. Disable in production unless intentional.");
        }

        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var account in BuildSeedAccountSpecs(config, logger))
        {
            if (!string.IsNullOrWhiteSpace(account.Email))
            {
                var dedupeKey = account.Email.Trim();
                if (!seenEmails.Add(dedupeKey))
                {
                    logger.LogWarning("Skipping duplicate seed email in configuration: {Email}", dedupeKey);
                    continue;
                }
            }

            await EnsureUserAsync(
                userManager,
                account,
                syncPasswords,
                clearLockouts,
                logger);
        }

        var seedDemo = config.GetValue("Seed:DemoData", true);
        if (seedDemo)
        {
            await EnsureDemoDataAsync(db);
        }
    }

    private static IEnumerable<SeedAccountSpec> BuildSeedAccountSpecs(IConfiguration config, ILogger logger)
    {
        // Flat keys — same names as Azure App Service (Seed__AdminEmail, etc.)
        yield return new SeedAccountSpec(
            "Admin",
            config["Seed:AdminEmail"],
            config["Seed:AdminPassword"],
            "Admin",
            AppRoles.Admin);

        yield return new SeedAccountSpec(
            "Employee",
            config["Seed:EmployeeEmail"],
            config["Seed:EmployeePassword"],
            "Employee",
            AppRoles.Employee);

        yield return new SeedAccountSpec(
            "Donor",
            config["Seed:DonorEmail"],
            config["Seed:DonorPassword"],
            "Donor",
            AppRoles.Donor);

        var extras = config.GetSection("Seed:Accounts").Get<List<SeedAccountBinding>>() ?? [];
        foreach (var x in extras)
        {
            if (string.IsNullOrWhiteSpace(x.Email))
            {
                continue;
            }

            var role = string.IsNullOrWhiteSpace(x.Role) ? AppRoles.Employee : x.Role.Trim();
            if (role != AppRoles.Admin && role != AppRoles.Employee && role != AppRoles.Donor)
            {
                logger.LogWarning(
                    "Skipping Seed:Accounts entry for {Email}: invalid Role '{Role}' (use Admin, Employee, or Donor).",
                    x.Email.Trim(),
                    x.Role);
                continue;
            }

            yield return new SeedAccountSpec(
                "Accounts",
                x.Email.Trim(),
                x.Password,
                string.IsNullOrWhiteSpace(x.DisplayName) ? x.Email.Trim() : x.DisplayName.Trim(),
                role);
        }
    }

    private static async Task EnsureSchemaAsync(AppDbContext db)
    {
        // Competition-friendly schema patching for environments without EF migrations.
        // Adds tables in-place (idempotent) so Azure SQL can evolve without dropping the DB.
        await db.Database.ExecuteSqlRawAsync("""
IF OBJECT_ID(N'[dbo].[ImpactAllocations]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ImpactAllocations](
        [ImpactAllocationId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [SupporterId] INT NOT NULL,
        [SnapshotId] INT NULL,
        [AllocationDate] DATE NOT NULL,
        [Category] NVARCHAR(60) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(10) NOT NULL CONSTRAINT [DF_ImpactAllocations_Currency] DEFAULT N'PHP',
        [Notes] NVARCHAR(MAX) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL CONSTRAINT [DF_ImpactAllocations_CreatedAtUtc] DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX [IX_ImpactAllocations_SupporterId_AllocationDate]
        ON [dbo].[ImpactAllocations]([SupporterId], [AllocationDate]);

    CREATE INDEX [IX_ImpactAllocations_SnapshotId_Category]
        ON [dbo].[ImpactAllocations]([SnapshotId], [Category]);
END
""");
    }

    private static async Task EnsureUserAsync(
        UserManager<AppUser> userManager,
        SeedAccountSpec account,
        bool syncPasswords,
        bool clearLockouts,
        ILogger logger
    )
    {
        if (string.IsNullOrWhiteSpace(account.Email))
        {
            logger.LogInformation("Skipping seed for {Label}: email not configured.", account.Label);
            return;
        }

        if (string.IsNullOrWhiteSpace(account.Password))
        {
            logger.LogInformation(
                "Skipping seed for {Label} ({Email}): password not configured.",
                account.Label,
                account.Email);
            return;
        }

        var email = account.Email.Trim();
        var password = account.Password;
        var user = await userManager.FindByEmailAsync(email);
        var existedBefore = user is not null;

        if (user is null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = account.DisplayName
            };

            var created = await userManager.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                var msg = string.Join("; ", created.Errors.Select(e => $"{e.Code}:{e.Description}"));
                logger.LogError("Failed seeding user {Email}: {Errors}", email, msg);
                throw new InvalidOperationException($"Failed seeding user {email}: {msg}");
            }
        }
        else
        {
            if (syncPasswords)
            {
                var rem = await userManager.RemovePasswordAsync(user);
                if (!rem.Succeeded)
                {
                    var msg = string.Join("; ", rem.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    logger.LogError("Failed removing password for seeded user {Email}: {Errors}", email, msg);
                    throw new InvalidOperationException($"Failed removing password for seeded user {email}: {msg}");
                }

                var add = await userManager.AddPasswordAsync(user, password);
                if (!add.Succeeded)
                {
                    var msg = string.Join("; ", add.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    logger.LogError("Failed setting password for seeded user {Email}: {Errors}", email, msg);
                    throw new InvalidOperationException($"Failed setting password for seeded user {email}: {msg}");
                }
            }
        }

        if (clearLockouts)
        {
            await userManager.SetLockoutEndDateAsync(user, null);
            await userManager.ResetAccessFailedCountAsync(user);
        }

        if (!await userManager.IsInRoleAsync(user, account.Role))
        {
            await userManager.AddToRoleAsync(user, account.Role);
        }
    }

    private static async Task EnsureDemoDataAsync(AppDbContext db)
    {
        if (!await db.Safehouses.AnyAsync())
        {
            db.Safehouses.AddRange(
                new Models.Safehouse { Name = "Safehouse A", Location = "Metro Manila", IsActive = true },
                new Models.Safehouse { Name = "Safehouse B", Location = "Cebu", IsActive = true }
            );
            await db.SaveChangesAsync();
        }

        if (!await db.PublicImpactSnapshots.AnyAsync(x => x.IsPublished))
        {
            db.PublicImpactSnapshots.Add(new Models.PublicImpactSnapshot
            {
                SnapshotDate = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-30)),
                Headline = "Last month: steady progress across safehouses",
                SummaryText = "Aggregate metrics show consistent improvements in education and health engagement while maintaining safety standards.",
                MetricPayloadJson = "{\"activeResidents\": 22, \"homeVisits\": 14, \"processRecordings\": 58}",
                IsPublished = true,
                PublishedAt = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-28))
            });
            await db.SaveChangesAsync();
        }
    }

    private sealed record SeedAccountSpec(string Label, string? Email, string? Password, string DisplayName, string Role);
}
