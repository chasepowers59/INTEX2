using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Intex.Api.Data;

/// <summary>Design-time factory for <c>dotnet ef migrations</c> (no production connection string required).</summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(
                "Server=(localdb)\\mssqllocaldb;Database=IntexMigrationsScratch;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true")
            .Options;

        return new AppDbContext(options);
    }
}
