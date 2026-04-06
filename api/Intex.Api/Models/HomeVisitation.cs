using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class HomeVisitation
{
    public int HomeVisitationId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateOnly VisitDate { get; set; }

    [MaxLength(120)]
    public string? SocialWorkerName { get; set; }

    [MaxLength(80)]
    public string VisitType { get; set; } = "RoutineFollowUp";

    [MaxLength(300)]
    public string? LocationVisited { get; set; }

    [MaxLength(200)]
    public string? FamilyMembersPresent { get; set; }

    public string? Purpose { get; set; }
    public string? Observations { get; set; }

    [MaxLength(40)]
    public string? FamilyCooperationLevel { get; set; }

    public bool SafetyConcernsNoted { get; set; }
    public bool FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }

    [MaxLength(40)]
    public string? VisitOutcome { get; set; }

    public string? SafetyConcerns { get; set; }
    public string? FollowUpActions { get; set; }
}
