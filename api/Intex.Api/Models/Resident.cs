using System.ComponentModel.DataAnnotations;

namespace Intex.Api.Models;

/// <summary>Case <c>residents</c> inventory (subset + key flags; extend as needed).</summary>
public sealed class Resident
{
    public int ResidentId { get; set; }

    [MaxLength(40)]
    public string? CaseControlNo { get; set; }

    [MaxLength(80)]
    public string? InternalCode { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    [MaxLength(20)]
    public string CaseStatus { get; set; } = "Active";

    [MaxLength(10)]
    public string Sex { get; set; } = "F";

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? BirthStatus { get; set; }

    [MaxLength(200)]
    public string? PlaceOfBirth { get; set; }

    [MaxLength(80)]
    public string? Religion { get; set; }

    [MaxLength(40)]
    public string? CaseCategory { get; set; }

    public bool? SubCatOrphaned { get; set; }
    public bool? SubCatTrafficked { get; set; }
    public bool? SubCatChildLabor { get; set; }
    public bool? SubCatPhysicalAbuse { get; set; }
    public bool? SubCatSexualAbuse { get; set; }
    public bool? SubCatOsaec { get; set; }
    public bool? SubCatCicl { get; set; }
    public bool? SubCatAtRisk { get; set; }
    public bool? SubCatStreetChild { get; set; }
    public bool? SubCatChildWithHiv { get; set; }

    public bool? IsPwd { get; set; }

    [MaxLength(120)]
    public string? PwdType { get; set; }

    public bool? HasSpecialNeeds { get; set; }

    [MaxLength(200)]
    public string? SpecialNeedsDiagnosis { get; set; }

    public bool? FamilyIs4ps { get; set; }
    public bool? FamilySoloParent { get; set; }
    public bool? FamilyIndigenous { get; set; }
    public bool? FamilyParentPwd { get; set; }
    public bool? FamilyInformalSettler { get; set; }

    public DateOnly? DateOfAdmission { get; set; }

    [MaxLength(80)]
    public string? AgeUponAdmission { get; set; }

    [MaxLength(80)]
    public string? PresentAge { get; set; }

    [MaxLength(80)]
    public string? LengthOfStay { get; set; }

    [MaxLength(40)]
    public string? ReferralSource { get; set; }

    [MaxLength(200)]
    public string? ReferringAgencyPerson { get; set; }

    [MaxLength(120)]
    public string? AssignedSocialWorker { get; set; }

    [MaxLength(80)]
    public string? InitialRiskLevel { get; set; }

    [MaxLength(80)]
    public string? CurrentRiskLevel { get; set; }

    [MaxLength(40)]
    public string? ReintegrationType { get; set; }

    [MaxLength(40)]
    public string? ReintegrationStatus { get; set; }

    public DateOnly? DateClosed { get; set; }
    public string? NotesRestricted { get; set; }

    // --- App / UI convenience (maps from internal_code or case_control_no) ---
    [MaxLength(120)]
    public string DisplayName { get; set; } = "";

    [MaxLength(80)]
    public string? SubCategory { get; set; }

    public DateOnly? AdmissionDate { get; set; }

    public bool IsReintegrated { get; set; }
}
