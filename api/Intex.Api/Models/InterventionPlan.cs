using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class InterventionPlan
{
    public int PlanId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    [MaxLength(40)]
    public string PlanCategory { get; set; } = "";

    public string PlanDescription { get; set; } = "";
    public string? ServicesProvided { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal? TargetValue { get; set; }

    public DateOnly? TargetDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Open";

    public DateOnly? CaseConferenceDate { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
