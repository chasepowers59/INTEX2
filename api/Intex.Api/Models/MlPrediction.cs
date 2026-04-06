using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

public sealed class MlPrediction
{
    public int PredictionId { get; set; }

    [MaxLength(80)]
    public string PredictionType { get; set; } = "";

    [MaxLength(40)]
    public string EntityType { get; set; } = "";

    public int EntityId { get; set; }

    [Column(TypeName = "decimal(18,6)")]
    public decimal Score { get; set; }

    [MaxLength(120)]
    public string? Label { get; set; }

    public string PayloadJson { get; set; } = "{}";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

