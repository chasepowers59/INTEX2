using Intex.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Contribution> Contributions => Set<Contribution>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();

    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<ImpactAllocation> ImpactAllocations => Set<ImpactAllocation>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
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

        builder.Entity<PublicImpactSnapshot>()
            .HasKey(x => x.SnapshotId);

        builder.Entity<MlPrediction>()
            .HasKey(x => x.PredictionId);

        builder.Entity<EducationRecord>()
            .HasKey(x => x.EducationRecordId);

        builder.Entity<HealthWellbeingRecord>()
            .HasKey(x => x.HealthRecordId);

        builder.Entity<InterventionPlan>()
            .HasKey(x => x.PlanId);

        builder.Entity<IncidentReport>()
            .HasKey(x => x.IncidentId);

        builder.Entity<SocialMediaPost>()
            .HasKey(x => x.PostId);

        builder.Entity<SafehouseMonthlyMetric>()
            .HasKey(x => x.MetricId);

        builder.Entity<Partner>()
            .HasKey(x => x.PartnerId);

        builder.Entity<PartnerAssignment>()
            .HasKey(x => x.AssignmentId);

        builder.Entity<InKindDonationItem>()
            .HasKey(x => x.ItemId);

        builder.Entity<DonationAllocation>()
            .HasKey(x => x.DonationAllocationId);

        builder.Entity<Safehouse>()
            .HasIndex(x => x.SafehouseCode);

        builder.Entity<Resident>()
            .HasIndex(x => x.SafehouseId);

        builder.Entity<ProcessRecording>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HomeVisitation>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CaseConference>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EducationRecord>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HealthWellbeingRecord>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InterventionPlan>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Resident>()
            .HasOne(x => x.Safehouse)
            .WithMany()
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<IncidentReport>()
            .HasOne(x => x.Resident)
            .WithMany()
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<IncidentReport>()
            .HasOne(x => x.Safehouse)
            .WithMany()
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<PartnerAssignment>()
            .HasOne(x => x.Partner)
            .WithMany()
            .HasForeignKey(x => x.PartnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(x => x.Safehouse)
            .WithMany()
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Contribution>()
            .HasOne(x => x.Supporter)
            .WithMany()
            .HasForeignKey(x => x.SupporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Contribution>()
            .HasOne(x => x.CreatedByPartner)
            .WithMany()
            .HasForeignKey(x => x.CreatedByPartnerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Contribution>()
            .HasOne(x => x.ReferralPost)
            .WithMany()
            .HasForeignKey(x => x.ReferralPostId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<InKindDonationItem>()
            .HasOne(x => x.Contribution)
            .WithMany()
            .HasForeignKey(x => x.ContributionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DonationAllocation>()
            .HasOne(x => x.Contribution)
            .WithMany()
            .HasForeignKey(x => x.ContributionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DonationAllocation>()
            .HasOne(x => x.Safehouse)
            .WithMany()
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ImpactAllocation>()
            .HasIndex(x => new { x.SupporterId, x.AllocationDate });

        builder.Entity<ImpactAllocation>()
            .HasOne(x => x.Contribution)
            .WithMany()
            .HasForeignKey(x => x.ContributionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<ImpactAllocation>()
            .HasIndex(x => new { x.SnapshotId, x.Category });

        builder.Entity<MlPrediction>()
            .HasIndex(x => new { x.PredictionType, x.EntityType, x.EntityId });

        builder.Entity<MlPrediction>()
            .HasIndex(x => new { x.PredictionType, x.CreatedAtUtc });

        builder.Entity<PublicImpactSnapshot>()
            .HasIndex(x => x.SnapshotDate);

        builder.Entity<SocialMediaPost>()
            .HasIndex(x => x.CreatedAt);

        builder.Entity<SafehouseMonthlyMetric>()
            .HasIndex(x => new { x.SafehouseId, x.MonthStart });
    }
}
