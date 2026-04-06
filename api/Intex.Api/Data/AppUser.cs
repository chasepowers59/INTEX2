using Microsoft.AspNetCore.Identity;

namespace Intex.Api.Data;

public sealed class AppUser : IdentityUser
{
    public string? DisplayName { get; set; }

    // Optional: link a donor user to a supporter record for "my donation history".
    public int? SupporterId { get; set; }
}
