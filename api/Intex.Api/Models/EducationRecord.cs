using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class EducationRecord
{
    public int EducationRecordId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateOnly RecordDate { get; set; }

    [MaxLength(80)]
    public string ProgramName { get; set; } = "";

    [MaxLength(80)]
    public string CourseName { get; set; } = "";

    [MaxLength(40)]
    public string EducationLevel { get; set; } = "";

    [MaxLength(20)]
    public string AttendanceStatus { get; set; } = "";

    [Column(TypeName = "decimal(9,4)")]
    public decimal? AttendanceRate { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? ProgressPercent { get; set; }

    [MaxLength(20)]
    public string CompletionStatus { get; set; } = "";

    [Column(TypeName = "decimal(9,4)")]
    public decimal? GpaLikeScore { get; set; }

    public string? Notes { get; set; }
}
