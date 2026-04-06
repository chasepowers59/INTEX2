using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class SocialMediaPost
{
    public int PostId { get; set; }

    [MaxLength(40)]
    public string Platform { get; set; } = "";

    [MaxLength(80)]
    public string? PlatformPostId { get; set; }

    [MaxLength(500)]
    public string? PostUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    [MaxLength(20)]
    public string? DayOfWeek { get; set; }

    public int? PostHour { get; set; }

    [MaxLength(40)]
    public string PostType { get; set; } = "";

    [MaxLength(20)]
    public string MediaType { get; set; } = "";

    public string? Caption { get; set; }
    public string? Hashtags { get; set; }
    public int? NumHashtags { get; set; }
    public int? MentionsCount { get; set; }
    public bool HasCallToAction { get; set; }

    [MaxLength(40)]
    public string? CallToActionType { get; set; }

    [MaxLength(40)]
    public string? ContentTopic { get; set; }

    [MaxLength(40)]
    public string? SentimentTone { get; set; }

    public int? CaptionLength { get; set; }
    public bool FeaturesResidentStory { get; set; }

    [MaxLength(120)]
    public string? CampaignName { get; set; }

    public bool IsBoosted { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? BoostBudgetPhp { get; set; }

    public int? Impressions { get; set; }
    public int? Reach { get; set; }
    public int? Likes { get; set; }
    public int? Comments { get; set; }
    public int? Shares { get; set; }
    public int? Saves { get; set; }
    public int? ClickThroughs { get; set; }
    public int? VideoViews { get; set; }

    [Column(TypeName = "decimal(18,6)")]
    public decimal? EngagementRate { get; set; }

    public int? ProfileVisits { get; set; }
    public int? DonationReferrals { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedDonationValuePhp { get; set; }

    public int? FollowerCountAtPost { get; set; }
}
