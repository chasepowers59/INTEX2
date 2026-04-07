using Intex.Api.Auth;
using Intex.Api.Models;
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
        // Schema is applied by EF MigrateAsync in Program.cs. Seeding only adds roles/users/demo rows.

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

        var userCount = await userManager.Users.CountAsync();
        if (userCount == 0
            && !string.IsNullOrWhiteSpace(config["Seed:AdminEmail"])
            && !string.IsNullOrWhiteSpace(config["Seed:AdminPassword"]))
        {
            var reqLen = config.GetValue("Identity:Password:RequiredLength", 12);
            logger.LogCritical(
                "Zero Identity users after seeding while Seed:AdminEmail and Seed:AdminPassword are set. " +
                "The admin password almost certainly failed Identity validation (need length {RequiredLength}+ with upper, lower, digit, and non-alphanumeric). " +
                "Update Seed__AdminPassword in App Service (or adjust Identity__Password__* settings), then restart. See earlier SeedData logs for PasswordTooShort / etc.",
                reqLen);
        }

        var seedDemo = config.GetValue("Seed:DemoData", true);
        if (seedDemo)
        {
            await EnsureDemoDataAsync(db);
            await EnsureDonorPortalDemoAsync(db, userManager, config, logger);
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

        if (user is null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = account.DisplayName
            };

            if (!await ValidateSeedPasswordAsync(userManager, user, password, email, account.Label, logger))
            {
                return;
            }

            var created = await userManager.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                var msg = string.Join("; ", created.Errors.Select(e => $"{e.Code}:{e.Description}"));
                logger.LogError("Failed seeding user {Email}: {Errors}", email, msg);
                return;
            }
        }
        else
        {
            if (syncPasswords)
            {
                if (!await ValidateSeedPasswordAsync(userManager, user, password, email, account.Label, logger))
                {
                    return;
                }

                var rem = await userManager.RemovePasswordAsync(user);
                if (!rem.Succeeded)
                {
                    var msg = string.Join("; ", rem.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    logger.LogError("Failed removing password for seeded user {Email}: {Errors}", email, msg);
                    return;
                }

                var add = await userManager.AddPasswordAsync(user, password);
                if (!add.Succeeded)
                {
                    var msg = string.Join("; ", add.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    logger.LogError("Failed setting password for seeded user {Email}: {Errors}", email, msg);
                    return;
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
            var roleAdd = await userManager.AddToRoleAsync(user, account.Role);
            if (!roleAdd.Succeeded)
            {
                var msg = string.Join("; ", roleAdd.Errors.Select(e => $"{e.Code}:{e.Description}"));
                logger.LogError("Failed adding role {Role} to seeded user {Email}: {Errors}", account.Role, email, msg);
            }
        }
    }

    private static async Task<bool> ValidateSeedPasswordAsync(
        UserManager<AppUser> userManager,
        AppUser user,
        string password,
        string email,
        string label,
        ILogger logger
    )
    {
        foreach (var validator in userManager.PasswordValidators)
        {
            var vr = await validator.ValidateAsync(userManager, user, password);
            if (!vr.Succeeded)
            {
                var msg = string.Join("; ", vr.Errors.Select(e => $"{e.Code}: {e.Description}"));
                logger.LogError(
                    "Seed password for {Label} ({Email}) failed Identity validation: {Errors}. " +
                    "Azure: set Seed__AdminPassword (etc.) to at least the length in Identity:Password:RequiredLength with upper, lower, digit, and a symbol.",
                    label,
                    email,
                    msg);
                return false;
            }
        }

        return true;
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

    /// <summary>
    /// When <c>Seed:DonorEmail</c> is set, ensures a matching <see cref="Supporter"/>, links the donor user,
    /// and adds sample <see cref="Contribution"/> / <see cref="ImpactAllocation"/> rows so <c>/app/donor</c> is non-empty.
    /// </summary>
    private static async Task EnsureDonorPortalDemoAsync(
        AppDbContext db,
        UserManager<AppUser> userManager,
        IConfiguration config,
        ILogger logger
    )
    {
        var donorEmail = config["Seed:DonorEmail"]?.Trim();
        if (string.IsNullOrEmpty(donorEmail))
        {
            return;
        }

        var user = await userManager.FindByEmailAsync(donorEmail);
        if (user is null || !await userManager.IsInRoleAsync(user, AppRoles.Donor))
        {
            logger.LogInformation(
                "Skipping donor portal demo data: no Identity user with Donor role for {Email}.",
                donorEmail);
            return;
        }

        var supporter = await db.Supporters.FirstOrDefaultAsync(s => s.Email == donorEmail);
        if (supporter is null)
        {
            supporter = new Supporter
            {
                FullName = user.DisplayName ?? "Demo donor",
                DisplayName = user.DisplayName ?? "Demo donor",
                Email = donorEmail,
                SupporterType = "Monetary",
                IsActive = true
            };
            db.Supporters.Add(supporter);
            await db.SaveChangesAsync();
            logger.LogInformation("Created Supporter record for seeded donor {Email} (SupporterId={Id}).", donorEmail, supporter.SupporterId);
        }

        if (user.SupporterId != supporter.SupporterId)
        {
            user.SupporterId = supporter.SupporterId;
            var updated = await userManager.UpdateAsync(user);
            if (!updated.Succeeded)
            {
                var msg = string.Join("; ", updated.Errors.Select(e => $"{e.Code}:{e.Description}"));
                logger.LogWarning("Could not link donor user to SupporterId {Id}: {Errors}", supporter.SupporterId, msg);
            }
            else
            {
                logger.LogInformation("Linked donor login {Email} to SupporterId {Id}.", donorEmail, supporter.SupporterId);
            }
        }

        var sid = supporter.SupporterId;
        if (!await db.Contributions.AnyAsync(c => c.SupporterId == sid))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            db.Contributions.AddRange(
                new Contribution
                {
                    SupporterId = sid,
                    ContributionType = "Monetary",
                    Amount = 2500m,
                    Currency = "PHP",
                    ContributionDate = today.AddMonths(-2),
                    CampaignName = "Year-End Hope",
                    Notes = "Seeded demo contribution"
                },
                new Contribution
                {
                    SupporterId = sid,
                    ContributionType = "Monetary",
                    Amount = 1000m,
                    Currency = "PHP",
                    ContributionDate = today.AddMonths(-1),
                    CampaignName = "Back to School",
                    Notes = "Seeded demo contribution"
                });
            await db.SaveChangesAsync();
        }

        if (!await db.ImpactAllocations.AnyAsync(a => a.SupporterId == sid))
        {
            var snapshot = await db.PublicImpactSnapshots.AsNoTracking()
                .Where(x => x.IsPublished)
                .OrderByDescending(x => x.SnapshotId)
                .FirstOrDefaultAsync();

            var month = DateOnly.FromDateTime(DateTime.UtcNow);
            db.ImpactAllocations.AddRange(
                new ImpactAllocation
                {
                    SupporterId = sid,
                    SnapshotId = snapshot?.SnapshotId,
                    AllocationDate = month.AddMonths(-1),
                    Category = "Education",
                    Amount = 1800m,
                    Currency = "PHP",
                    Notes = "Seeded demo allocation"
                },
                new ImpactAllocation
                {
                    SupporterId = sid,
                    SnapshotId = snapshot?.SnapshotId,
                    AllocationDate = month,
                    Category = "Wellbeing",
                    Amount = 700m,
                    Currency = "PHP",
                    Notes = "Seeded demo allocation"
                });
            await db.SaveChangesAsync();
        }
    }

    private sealed record SeedAccountSpec(string Label, string? Email, string? Password, string DisplayName, string Role);
}
