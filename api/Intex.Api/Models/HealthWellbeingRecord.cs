using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class HealthWellbeingRecord
{
    public int HealthRecordId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateOnly RecordDate { get; set; }

    [Column(TypeName = "decimal(9,2)")]
    public decimal? WeightKg { get; set; }

    [Column(TypeName = "decimal(9,2)")]
    public decimal? HeightCm { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? Bmi { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? NutritionScore { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? SleepScore { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? EnergyScore { get; set; }

    [Column(TypeName = "decimal(9,4)")]
    public decimal? GeneralHealthScore { get; set; }

    public bool MedicalCheckupDone { get; set; }
    public bool DentalCheckupDone { get; set; }
    public bool PsychologicalCheckupDone { get; set; }
    public string? MedicalNotesRestricted { get; set; }
}
