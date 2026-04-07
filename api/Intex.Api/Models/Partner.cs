using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Partner
{
    public int PartnerId { get; set; }

    [MaxLength(200)]
    public string PartnerName { get; set; } = "";

    [MaxLength(40)]
    public string PartnerType { get; set; } = "";

    [MaxLength(60)]
    public string RoleType { get; set; } = "";

    [MaxLength(120)]
    public string? ContactName { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(40)]
    public string? Phone { get; set; }

    [MaxLength(80)]
    public string? Region { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }
}
