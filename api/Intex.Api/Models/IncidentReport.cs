using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class IncidentReport
{
    public int IncidentId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    public DateOnly IncidentDate { get; set; }

    [MaxLength(40)]
    public string IncidentType { get; set; } = "";

    [MaxLength(20)]
    public string Severity { get; set; } = "";

    public string Description { get; set; } = "";
    public string? ResponseTaken { get; set; }
    public bool Resolved { get; set; }
    public DateOnly? ResolutionDate { get; set; }

    [MaxLength(120)]
    public string? ReportedBy { get; set; }

    public bool FollowUpRequired { get; set; }
}
