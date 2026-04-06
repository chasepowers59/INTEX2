using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class HomeVisitation
{
    public int HomeVisitationId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateOnly VisitDate { get; set; }

    [MaxLength(50)]
    public string VisitType { get; set; } = "RoutineFollowUp";

    public string? Observations { get; set; }

    [MaxLength(40)]
    public string? FamilyCooperationLevel { get; set; }

    public string? SafetyConcerns { get; set; }

    public string? FollowUpActions { get; set; }
}

