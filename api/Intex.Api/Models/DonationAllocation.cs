using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

/// <summary>Case donation_allocations: how a donation is split across safehouses/programs.</summary>
public sealed class DonationAllocation
{
    public int DonationAllocationId { get; set; }

    public int ContributionId { get; set; }
    public Contribution? Contribution { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    [MaxLength(40)]
    public string ProgramArea { get; set; } = "";

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountAllocated { get; set; }

    public DateOnly AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }
}
