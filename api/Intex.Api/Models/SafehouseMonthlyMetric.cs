using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class SafehouseMonthlyMetric
{
    public int MetricId { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    public DateOnly MonthStart { get; set; }
    public DateOnly MonthEnd { get; set; }

    public int ActiveResidents { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal? AvgEducationProgress { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal? AvgHealthScore { get; set; }

    public int ProcessRecordingCount { get; set; }
    public int HomeVisitationCount { get; set; }
    public int IncidentCount { get; set; }
    public string? Notes { get; set; }
}
