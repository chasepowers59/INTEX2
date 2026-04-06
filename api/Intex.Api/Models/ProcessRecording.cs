using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class ProcessRecording
{
    public int ProcessRecordingId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateOnly SessionDate { get; set; }

    [MaxLength(120)]
    public string SocialWorkerName { get; set; } = "";

    [MaxLength(30)]
    public string SessionType { get; set; } = "Individual";

    public int? SessionDurationMinutes { get; set; }

    [MaxLength(80)]
    public string? EmotionalStateObserved { get; set; }

    [MaxLength(80)]
    public string? EmotionalStateEnd { get; set; }

    public string NarrativeSummary { get; set; } = "";

    public string? InterventionsApplied { get; set; }

    public string? FollowUpActions { get; set; }

    public bool ProgressNoted { get; set; }
    public bool ConcernsFlagged { get; set; }
    public bool ReferralMade { get; set; }

    public string? NotesRestricted { get; set; }
}
