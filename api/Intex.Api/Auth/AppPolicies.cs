namespace Intex.Api.Auth;

/// <summary>Named authorization policies (register in <c>Program.cs</c>).</summary>
public static class AppPolicies
{
    /// <summary>Staff portal: Admin or Employee only (excludes Donor-only JWTs).</summary>
    public const string StaffOnly = nameof(StaffOnly);
}
