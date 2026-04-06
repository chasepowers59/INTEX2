using Intex.Api.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data;

public static class SeedData
{
    public static async Task EnsureSeededAsync(IServiceProvider services, IConfiguration config)
    {
        await using var scope = services.CreateAsyncScope();
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

        // Optional seed users via env vars / App Service settings.
        // Set these in Azure App Service Configuration (or locally) and rotate after grading.
        await EnsureUserAsync(
            userManager,
            email: config["Seed:AdminEmail"],
            password: config["Seed:AdminPassword"],
            displayName: "Admin",
            role: AppRoles.Admin
        );

        await EnsureUserAsync(
            userManager,
            email: config["Seed:EmployeeEmail"],
            password: config["Seed:EmployeePassword"],
            displayName: "Employee",
            role: AppRoles.Employee
        );

        await EnsureUserAsync(
            userManager,
            email: config["Seed:DonorEmail"],
            password: config["Seed:DonorPassword"],
            displayName: "Donor",
            role: AppRoles.Donor
        );

        var seedDemo = config.GetValue("Seed:DemoData", true);
        if (seedDemo)
        {
            await EnsureDemoDataAsync(db);
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
        string? email,
        string? password,
        string displayName,
        string role
    )
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = displayName
            };

            var created = await userManager.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                var msg = string.Join("; ", created.Errors.Select(e => $"{e.Code}:{e.Description}"));
                throw new InvalidOperationException($"Failed seeding user {email}: {msg}");
            }
        }

        if (!await userManager.IsInRoleAsync(user, role))
        {
            await userManager.AddToRoleAsync(user, role);
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
}
