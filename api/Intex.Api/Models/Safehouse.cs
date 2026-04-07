using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Safehouse
{
    public int SafehouseId { get; set; }

    [MaxLength(20)]
    public string? SafehouseCode { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = "";

    [MaxLength(80)]
    public string? Region { get; set; }

    [MaxLength(120)]
    public string? City { get; set; }

    [MaxLength(120)]
    public string? Province { get; set; }

    [MaxLength(80)]
    public string? Country { get; set; }

    public DateOnly? OpenDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public int CapacityGirls { get; set; }
    public int CapacityStaff { get; set; }
    public int CurrentOccupancy { get; set; }

    public string? Notes { get; set; }

    /// <summary>Legacy single-line location for UI; import may set City+Province instead.</summary>
    [MaxLength(200)]
    public string? Location { get; set; }

    public bool IsActive { get; set; } = true;
}
