using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class PublicImpactSnapshot
{
    public int SnapshotId { get; set; }

    public DateOnly SnapshotDate { get; set; }

    [MaxLength(200)]
    public string Headline { get; set; } = "";

    public string SummaryText { get; set; } = "";

    public string MetricPayloadJson { get; set; } = "{}";

    public bool IsPublished { get; set; }

    public DateOnly? PublishedAt { get; set; }
}

