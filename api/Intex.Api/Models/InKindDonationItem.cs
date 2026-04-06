using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class InKindDonationItem
{
    public int ItemId { get; set; }

    public int ContributionId { get; set; }
    public Contribution? Contribution { get; set; }

    [MaxLength(200)]
    public string ItemName { get; set; } = "";

    [MaxLength(40)]
    public string ItemCategory { get; set; } = "";

    public int Quantity { get; set; }

    [MaxLength(20)]
    public string UnitOfMeasure { get; set; } = "";

    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedUnitValue { get; set; }

    [MaxLength(40)]
    public string? IntendedUse { get; set; }

    [MaxLength(20)]
    public string? ReceivedCondition { get; set; }
}
