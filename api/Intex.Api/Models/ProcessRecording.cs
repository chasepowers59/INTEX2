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

    [MaxLength(80)]
    public string? EmotionalStateObserved { get; set; }

    public string NarrativeSummary { get; set; } = "";

    public string? InterventionsApplied { get; set; }

    public string? FollowUpActions { get; set; }
}

