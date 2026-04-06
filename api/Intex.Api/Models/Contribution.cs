using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

/// <summary>Maps Lighthouse <c>donations</c> CSV (donation_id → ContributionId).</summary>
public sealed class Contribution
{
    public int ContributionId { get; set; }

    public int SupporterId { get; set; }
    public Supporter? Supporter { get; set; }

    [MaxLength(30)]
    public string ContributionType { get; set; } = "Monetary";

    public DateOnly ContributionDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [MaxLength(40)]
    public string? ChannelSource { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "PHP";

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Amount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedValue { get; set; }

    [MaxLength(20)]
    public string? ImpactUnit { get; set; }

    public bool IsRecurring { get; set; }

    [MaxLength(200)]
    public string? CampaignName { get; set; }

    public string? Notes { get; set; }

    public int? CreatedByPartnerId { get; set; }
    public Partner? CreatedByPartner { get; set; }

    public int? ReferralPostId { get; set; }
    public SocialMediaPost? ReferralPost { get; set; }
}
