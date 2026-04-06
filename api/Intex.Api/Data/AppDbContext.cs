using Intex.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Contribution> Contributions => Set<Contribution>();

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();

    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<ImpactAllocation> ImpactAllocations => Set<ImpactAllocation>();
    public DbSet<MlPrediction> MlPredictions => Set<MlPrediction>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>()
            .HasOne<Supporter>()
            .WithMany()
            .HasForeignKey(u => u.SupporterId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Supporter>()
            .HasIndex(x => x.Email);

        // Explicit keys for entities whose PK property name doesn't match EF conventions.
        builder.Entity<PublicImpactSnapshot>()
            .HasKey(x => x.SnapshotId);

        builder.Entity<MlPrediction>()
            .HasKey(x => x.PredictionId);

        builder.Entity<Resident>()
            .HasIndex(x => x.SafehouseId);

        builder.Entity<ProcessRecording>()
            .HasIndex(x => x.ResidentId);

        builder.Entity<HomeVisitation>()
            .HasIndex(x => x.ResidentId);

        builder.Entity<CaseConference>()
            .HasIndex(x => x.ResidentId);

        builder.Entity<PublicImpactSnapshot>()
            .HasIndex(x => x.SnapshotDate);

        builder.Entity<ImpactAllocation>()
            .HasIndex(x => new { x.SupporterId, x.AllocationDate });

        builder.Entity<ImpactAllocation>()
            .HasIndex(x => new { x.SnapshotId, x.Category });

        builder.Entity<MlPrediction>()
            .HasIndex(x => new { x.PredictionType, x.EntityType, x.EntityId });

        builder.Entity<MlPrediction>()
            .HasIndex(x => new { x.PredictionType, x.CreatedAtUtc });
    }
}
