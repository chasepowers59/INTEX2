using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Supporter
{
    public int SupporterId { get; set; }

    [MaxLength(200)]
    public string FullName { get; set; } = "";

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string SupporterType { get; set; } = "Monetary";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

