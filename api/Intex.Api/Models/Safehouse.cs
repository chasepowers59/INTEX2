using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

public sealed class Safehouse
{
    public int SafehouseId { get; set; }

    [MaxLength(120)]
    public string Name { get; set; } = "";

    [MaxLength(200)]
    public string? Location { get; set; }

    public bool IsActive { get; set; } = true;
}

