using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Resident
{
    public int ResidentId { get; set; }

    [MaxLength(120)]
    public string DisplayName { get; set; } = "";

    [MaxLength(40)]
    public string CaseStatus { get; set; } = "Active";

    [MaxLength(80)]
    public string? CaseCategory { get; set; }

    [MaxLength(80)]
    public string? SubCategory { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    public DateOnly? AdmissionDate { get; set; }

    [MaxLength(120)]
    public string? AssignedSocialWorker { get; set; }

    public bool IsReintegrated { get; set; }
}

