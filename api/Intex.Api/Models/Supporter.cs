using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Supporter
{
    public int SupporterId { get; set; }

    [MaxLength(40)]
    public string SupporterType { get; set; } = "MonetaryDonor";

    [MaxLength(200)]
    public string DisplayName { get; set; } = "";

    [MaxLength(200)]
    public string? OrganizationName { get; set; }

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(40)]
    public string? RelationshipType { get; set; }

    [MaxLength(80)]
    public string? Region { get; set; }

    [MaxLength(80)]
    public string? Country { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public DateOnly? FirstDonationDate { get; set; }

    [MaxLength(40)]
    public string? AcquisitionChannel { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>UI / legacy: full display name (import maps from display_name or first+last).</summary>
    [MaxLength(200)]
    public string FullName { get; set; } = "";

    public bool IsActive { get; set; } = true;
}
