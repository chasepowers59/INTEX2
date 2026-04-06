using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class Contribution
{
    public int ContributionId { get; set; }

    public int SupporterId { get; set; }
    public Supporter? Supporter { get; set; }

    [MaxLength(30)]
    public string ContributionType { get; set; } = "Monetary";

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "PHP";

    public DateOnly ContributionDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [MaxLength(200)]
    public string? CampaignName { get; set; }

    public string? Notes { get; set; }
}

