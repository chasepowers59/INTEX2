using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class ImpactAllocation
{
    public int ImpactAllocationId { get; set; }

    public int SupporterId { get; set; }
    public Supporter? Supporter { get; set; }

    public int? ContributionId { get; set; }
    public Contribution? Contribution { get; set; }

    public int? SnapshotId { get; set; }
    public PublicImpactSnapshot? Snapshot { get; set; }

    public DateOnly AllocationDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [MaxLength(60)]
    public string Category { get; set; } = "";

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "PHP";

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

