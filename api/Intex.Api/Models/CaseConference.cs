using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class CaseConference
{
    public int CaseConferenceId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateTime ScheduledAtUtc { get; set; }

    [MaxLength(200)]
    public string? Topic { get; set; }

    public string? Notes { get; set; }

    public bool IsCompleted { get; set; }
}

