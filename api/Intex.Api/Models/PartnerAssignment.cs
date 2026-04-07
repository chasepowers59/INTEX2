using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class PartnerAssignment
{
    public int AssignmentId { get; set; }

    public int PartnerId { get; set; }
    public Partner? Partner { get; set; }

    public int? SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    [MaxLength(40)]
    public string ProgramArea { get; set; } = "";

    public DateOnly? AssignmentStart { get; set; }
    public DateOnly? AssignmentEnd { get; set; }
    public string? ResponsibilityNotes { get; set; }
    public bool IsPrimary { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";
}
