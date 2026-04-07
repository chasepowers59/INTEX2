using System.Dynamic;
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Services;

public sealed class LighthouseCsvImportService(
    AppDbContext db,
    IWebHostEnvironment env,
    IConfiguration config,
    ILogger<LighthouseCsvImportService> logger
)
{
    private static CsvConfiguration CsvConfig => new(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        MissingFieldFound = null,
        HeaderValidated = null,
        BadDataFound = null,
        PrepareHeaderForMatch = args => args.Header.Trim(),
    };

    public async Task<ImportResult> ImportAsync(string? sourceDirectory, bool replace, CancellationToken ct = default)
    {
        var dir = ResolveDirectory(sourceDirectory);
        if (dir is null || !Directory.Exists(dir))
        {
            return new ImportResult(false, $"Directory not found: {sourceDirectory ?? "(default)"}", []);
        }

        var files = Directory.GetFiles(dir, "*.csv", SearchOption.AllDirectories);
        if (files.Length == 0)
        {
            return new ImportResult(false, $"No CSV files under {dir}", []);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            if (replace)
            {
                await db.Database.ExecuteSqlRawAsync(
                    "UPDATE AspNetUsers SET SupporterId = NULL WHERE SupporterId IS NOT NULL",
                    cancellationToken: ct);
                await ClearOperationalTablesAsync(ct);
            }

            var log = new List<string>();

            await ImportSafehousesAsync(dir, log, ct);
            await ImportPartnersAsync(dir, log, ct);
            await ImportPartnerAssignmentsAsync(dir, log, ct);
            await ImportSupportersAsync(dir, log, ct);
            await ImportSocialMediaPostsAsync(dir, log, ct);
            await ImportContributionsAsync(dir, log, ct);
            await ImportInKindItemsAsync(dir, log, ct);
            await ImportDonationAllocationsAsync(dir, log, ct);
            await ImportResidentsAsync(dir, log, ct);
            await ImportProcessRecordingsAsync(dir, log, ct);
            await ImportHomeVisitationsAsync(dir, log, ct);
            await ImportEducationRecordsAsync(dir, log, ct);
            await ImportHealthRecordsAsync(dir, log, ct);
            await ImportInterventionPlansAsync(dir, log, ct);
            await ImportIncidentReportsAsync(dir, log, ct);
            await ImportSafehouseMonthlyMetricsAsync(dir, log, ct);
            await ImportPublicImpactSnapshotsAsync(dir, log, ct);

            await tx.CommitAsync(ct);
            log.Insert(0, replace ? "Import complete (replaced existing operational rows)." : "Import complete (merged).");
            return new ImportResult(true, null, log);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            logger.LogError(ex, "Lighthouse CSV import failed.");
            return new ImportResult(false, ex.Message, []);
        }
    }

    private string? ResolveDirectory(string? requested)
    {
        if (!string.IsNullOrWhiteSpace(requested))
        {
            var full = Path.GetFullPath(requested);
            if (Directory.Exists(full))
                return full;
        }

        var configured = config["LighthouseImport:SourceDirectory"];
        if (!string.IsNullOrWhiteSpace(configured) && Directory.Exists(configured))
            return Path.GetFullPath(configured);

        // Shipped with the published API (commit-friendly copy under LighthouseSeedCsv).
        var bundled = Path.GetFullPath(Path.Combine(env.ContentRootPath, "LighthouseSeedCsv", "lighthouse_csv_v7"));
        if (Directory.Exists(bundled))
            return bundled;

        // Repo layout: api/Intex.Api -> ../../data/raw
        var guess1 = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "data", "raw"));
        if (Directory.Exists(guess1))
            return guess1;

        var guess2 = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "data", "raw", "lighthouse_csv_v7"));
        if (Directory.Exists(guess2))
            return guess2;

        return null;
    }

    private async Task ClearOperationalTablesAsync(CancellationToken ct)
    {
        // FK-safe delete order (SQL Server); table names = EF defaults
        var names = new[]
        {
            nameof(MlPrediction),
            nameof(ImpactAllocation),
            nameof(CaseConference),
            nameof(ProcessRecording),
            nameof(HomeVisitation),
            nameof(EducationRecord),
            nameof(HealthWellbeingRecord),
            nameof(InterventionPlan),
            nameof(IncidentReport),
            nameof(InKindDonationItem),
            nameof(DonationAllocation),
            nameof(Contribution),
            nameof(SocialMediaPost),
            nameof(Resident),
            nameof(PartnerAssignment),
            nameof(Partner),
            nameof(Supporter),
            nameof(SafehouseMonthlyMetric),
            nameof(PublicImpactSnapshot),
            nameof(Safehouse),
        };

        foreach (var entityName in names)
        {
            var et = db.Model.GetEntityTypes().FirstOrDefault(x => x.ClrType.Name == entityName);
            if (et is null) continue;
            var table = et.GetTableName();
            var schema = et.GetSchema() ?? "dbo";
            await db.Database.ExecuteSqlRawAsync($"DELETE FROM [{schema}].[{table}]", cancellationToken: ct);
        }
    }

    private static string? PathFor(string dir, params string[] stems)
    {
        foreach (var s in stems)
        {
            var p = Path.Combine(dir, s + ".csv");
            if (File.Exists(p)) return p;
        }

        return null;
    }

    private async Task ImportSafehousesAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "safehouses");
        if (path is null) return;

        var rows = new List<Safehouse>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new Safehouse
                {
                    SafehouseId = ToInt(d, "safehouse_id") ?? 0,
                    SafehouseCode = ToStr(d, "safehouse_code"),
                    Name = ToStr(d, "name") ?? "",
                    Region = ToStr(d, "region"),
                    City = ToStr(d, "city"),
                    Province = ToStr(d, "province"),
                    Country = ToStr(d, "country"),
                    OpenDate = ToDateOnly(d, "open_date"),
                    Status = ToStr(d, "status") ?? "Active",
                    CapacityGirls = ToInt(d, "capacity_girls") ?? 0,
                    CapacityStaff = ToInt(d, "capacity_staff") ?? 0,
                    CurrentOccupancy = ToInt(d, "current_occupancy") ?? 0,
                    Notes = ToStr(d, "notes"),
                    Location = CombineLoc(ToStr(d, "city"), ToStr(d, "province")),
                    IsActive = !string.Equals(ToStr(d, "status"), "Inactive", StringComparison.OrdinalIgnoreCase),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.Safehouses.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"safehouses: {rows.Count}");
    }

    private async Task ImportPartnersAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "partners");
        if (path is null) return;

        var rows = new List<Partner>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new Partner
                {
                    PartnerId = ToInt(d, "partner_id") ?? 0,
                    PartnerName = ToStr(d, "partner_name") ?? "",
                    PartnerType = ToStr(d, "partner_type") ?? "",
                    RoleType = ToStr(d, "role_type") ?? "",
                    ContactName = ToStr(d, "contact_name"),
                    Email = ToStr(d, "email"),
                    Phone = ToStr(d, "phone"),
                    Region = ToStr(d, "region"),
                    Status = ToStr(d, "status") ?? "Active",
                    StartDate = ToDateOnly(d, "start_date"),
                    EndDate = ToDateOnly(d, "end_date"),
                    Notes = ToStr(d, "notes"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.Partners.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"partners: {rows.Count}");
    }

    private async Task ImportPartnerAssignmentsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "partner_assignments");
        if (path is null) return;

        var rows = new List<PartnerAssignment>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new PartnerAssignment
                {
                    AssignmentId = ToInt(d, "assignment_id") ?? 0,
                    PartnerId = ToInt(d, "partner_id") ?? 0,
                    SafehouseId = ToInt(d, "safehouse_id"),
                    ProgramArea = ToStr(d, "program_area") ?? "",
                    AssignmentStart = ToDateOnly(d, "assignment_start"),
                    AssignmentEnd = ToDateOnly(d, "assignment_end"),
                    ResponsibilityNotes = ToStr(d, "responsibility_notes"),
                    IsPrimary = ToBool(d, "is_primary") ?? false,
                    Status = ToStr(d, "status") ?? "Active",
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.PartnerAssignments.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"partner_assignments: {rows.Count}");
    }

    private async Task ImportSupportersAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "supporters");
        if (path is null) return;

        var rows = new List<Supporter>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                var display = ToStr(d, "display_name");
                var fn = ToStr(d, "first_name");
                var ln = ToStr(d, "last_name");
                var full = !string.IsNullOrWhiteSpace(display)
                    ? display!
                    : $"{fn} {ln}".Trim();
                if (string.IsNullOrWhiteSpace(full))
                    full = "Supporter";

                rows.Add(new Supporter
                {
                    SupporterId = ToInt(d, "supporter_id") ?? 0,
                    SupporterType = ToStr(d, "supporter_type") ?? "MonetaryDonor",
                    DisplayName = display ?? full,
                    OrganizationName = ToStr(d, "organization_name"),
                    FirstName = fn,
                    LastName = ln,
                    RelationshipType = ToStr(d, "relationship_type"),
                    Region = ToStr(d, "region"),
                    Country = ToStr(d, "country"),
                    Email = ToStr(d, "email"),
                    Phone = ToStr(d, "phone"),
                    Status = ToStr(d, "status") ?? "Active",
                    FirstDonationDate = ToDateOnly(d, "first_donation_date"),
                    AcquisitionChannel = ToStr(d, "acquisition_channel"),
                    CreatedAtUtc = ToDateTimeUtc(d, "created_at") ?? DateTime.UtcNow,
                    FullName = full,
                    IsActive = !string.Equals(ToStr(d, "status"), "Inactive", StringComparison.OrdinalIgnoreCase),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.Supporters.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"supporters: {rows.Count}");
    }

    private async Task ImportSocialMediaPostsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "social_media_posts");
        if (path is null) return;

        var rows = new List<SocialMediaPost>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new SocialMediaPost
                {
                    PostId = ToInt(d, "post_id") ?? 0,
                    Platform = ToStr(d, "platform") ?? "",
                    PlatformPostId = ToStr(d, "platform_post_id"),
                    PostUrl = ToStr(d, "post_url"),
                    CreatedAt = ToDateTimeUtc(d, "created_at") ?? DateTime.UtcNow,
                    DayOfWeek = ToStr(d, "day_of_week"),
                    PostHour = ToInt(d, "post_hour"),
                    PostType = ToStr(d, "post_type") ?? "",
                    MediaType = ToStr(d, "media_type") ?? "",
                    Caption = ToStr(d, "caption"),
                    Hashtags = ToStr(d, "hashtags"),
                    NumHashtags = ToInt(d, "num_hashtags"),
                    MentionsCount = ToInt(d, "mentions_count"),
                    HasCallToAction = ToBool(d, "has_call_to_action") ?? false,
                    CallToActionType = ToStr(d, "call_to_action_type"),
                    ContentTopic = ToStr(d, "content_topic"),
                    SentimentTone = ToStr(d, "sentiment_tone"),
                    CaptionLength = ToInt(d, "caption_length"),
                    FeaturesResidentStory = ToBool(d, "features_resident_story") ?? false,
                    CampaignName = ToStr(d, "campaign_name"),
                    IsBoosted = ToBool(d, "is_boosted") ?? false,
                    BoostBudgetPhp = ToDec(d, "boost_budget_php"),
                    Impressions = ToInt(d, "impressions"),
                    Reach = ToInt(d, "reach"),
                    Likes = ToInt(d, "likes"),
                    Comments = ToInt(d, "comments"),
                    Shares = ToInt(d, "shares"),
                    Saves = ToInt(d, "saves"),
                    ClickThroughs = ToInt(d, "click_throughs"),
                    VideoViews = ToInt(d, "video_views"),
                    EngagementRate = ToDec(d, "engagement_rate"),
                    ProfileVisits = ToInt(d, "profile_visits"),
                    DonationReferrals = ToInt(d, "donation_referrals"),
                    EstimatedDonationValuePhp = ToDec(d, "estimated_donation_value_php"),
                    FollowerCountAtPost = ToInt(d, "follower_count_at_post"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.SocialMediaPosts.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"social_media_posts: {rows.Count}");
    }

    private async Task ImportContributionsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "donations");
        if (path is null) return;

        var rows = new List<Contribution>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new Contribution
                {
                    ContributionId = ToInt(d, "donation_id") ?? 0,
                    SupporterId = ToInt(d, "supporter_id") ?? 0,
                    ContributionType = ToStr(d, "donation_type") ?? "Monetary",
                    ContributionDate = ToDateOnly(d, "donation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    ChannelSource = ToStr(d, "channel_source"),
                    Currency = ToStr(d, "currency_code") ?? "PHP",
                    Amount = ToDec(d, "amount"),
                    EstimatedValue = ToDec(d, "estimated_value"),
                    ImpactUnit = ToStr(d, "impact_unit"),
                    IsRecurring = ToBool(d, "is_recurring") ?? false,
                    CampaignName = ToStr(d, "campaign_name"),
                    Notes = ToStr(d, "notes"),
                    CreatedByPartnerId = ToInt(d, "created_by_partner_id"),
                    ReferralPostId = ToInt(d, "referral_post_id"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.Contributions.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"donations→Contributions: {rows.Count}");
    }

    private async Task ImportInKindItemsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "in_kind_donation_items");
        if (path is null) return;

        var rows = new List<InKindDonationItem>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new InKindDonationItem
                {
                    ItemId = ToInt(d, "item_id") ?? 0,
                    ContributionId = ToInt(d, "donation_id") ?? 0,
                    ItemName = ToStr(d, "item_name") ?? "",
                    ItemCategory = ToStr(d, "item_category") ?? "",
                    Quantity = ToInt(d, "quantity") ?? 0,
                    UnitOfMeasure = ToStr(d, "unit_of_measure") ?? "",
                    EstimatedUnitValue = ToDec(d, "estimated_unit_value"),
                    IntendedUse = ToStr(d, "intended_use"),
                    ReceivedCondition = ToStr(d, "received_condition"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.InKindDonationItems.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"in_kind_donation_items: {rows.Count}");
    }

    private async Task ImportDonationAllocationsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "donation_allocations");
        if (path is null) return;

        var rows = new List<DonationAllocation>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new DonationAllocation
                {
                    DonationAllocationId = ToInt(d, "allocation_id") ?? 0,
                    ContributionId = ToInt(d, "donation_id") ?? 0,
                    SafehouseId = ToInt(d, "safehouse_id") ?? 0,
                    ProgramArea = ToStr(d, "program_area") ?? "",
                    AmountAllocated = ToDec(d, "amount_allocated") ?? 0,
                    AllocationDate = ToDateOnly(d, "allocation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    AllocationNotes = ToStr(d, "allocation_notes"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.DonationAllocations.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"donation_allocations: {rows.Count}");
    }

    private async Task ImportResidentsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "residents");
        if (path is null) return;

        var rows = new List<Resident>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                var internalCode = ToStr(d, "internal_code");
                var caseNo = ToStr(d, "case_control_no");
                var display = !string.IsNullOrWhiteSpace(internalCode) ? internalCode! : caseNo ?? "Resident";

                rows.Add(new Resident
                {
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    CaseControlNo = caseNo,
                    InternalCode = internalCode,
                    SafehouseId = ToInt(d, "safehouse_id") ?? 0,
                    CaseStatus = ToStr(d, "case_status") ?? "Active",
                    Sex = ToStr(d, "sex") ?? "F",
                    DateOfBirth = ToDateOnly(d, "date_of_birth"),
                    BirthStatus = ToStr(d, "birth_status"),
                    PlaceOfBirth = ToStr(d, "place_of_birth"),
                    Religion = ToStr(d, "religion"),
                    CaseCategory = ToStr(d, "case_category"),
                    SubCatOrphaned = ToBool(d, "sub_cat_orphaned"),
                    SubCatTrafficked = ToBool(d, "sub_cat_trafficked"),
                    SubCatChildLabor = ToBool(d, "sub_cat_child_labor"),
                    SubCatPhysicalAbuse = ToBool(d, "sub_cat_physical_abuse"),
                    SubCatSexualAbuse = ToBool(d, "sub_cat_sexual_abuse"),
                    SubCatOsaec = ToBool(d, "sub_cat_osaec"),
                    SubCatCicl = ToBool(d, "sub_cat_cicl"),
                    SubCatAtRisk = ToBool(d, "sub_cat_at_risk"),
                    SubCatStreetChild = ToBool(d, "sub_cat_street_child"),
                    SubCatChildWithHiv = ToBool(d, "sub_cat_child_with_hiv"),
                    IsPwd = ToBool(d, "is_pwd"),
                    PwdType = ToStr(d, "pwd_type"),
                    HasSpecialNeeds = ToBool(d, "has_special_needs"),
                    SpecialNeedsDiagnosis = ToStr(d, "special_needs_diagnosis"),
                    FamilyIs4ps = ToBool(d, "family_is_4ps"),
                    FamilySoloParent = ToBool(d, "family_solo_parent"),
                    FamilyIndigenous = ToBool(d, "family_indigenous"),
                    FamilyParentPwd = ToBool(d, "family_parent_pwd"),
                    FamilyInformalSettler = ToBool(d, "family_informal_settler"),
                    DateOfAdmission = ToDateOnly(d, "date_of_admission"),
                    AgeUponAdmission = ToStr(d, "age_upon_admission"),
                    PresentAge = ToStr(d, "present_age"),
                    LengthOfStay = ToStr(d, "length_of_stay"),
                    ReferralSource = ToStr(d, "referral_source"),
                    ReferringAgencyPerson = ToStr(d, "referring_agency_person"),
                    AssignedSocialWorker = ToStr(d, "assigned_social_worker"),
                    InitialRiskLevel = ToStr(d, "initial_risk_level"),
                    CurrentRiskLevel = ToStr(d, "current_risk_level"),
                    ReintegrationType = ToStr(d, "reintegration_type"),
                    ReintegrationStatus = ToStr(d, "reintegration_status"),
                    DateClosed = ToDateOnly(d, "date_closed"),
                    NotesRestricted = ToStr(d, "notes_restricted"),
                    DisplayName = display,
                    SubCategory = null,
                    AdmissionDate = ToDateOnly(d, "date_of_admission"),
                    IsReintegrated = string.Equals(ToStr(d, "reintegration_status"), "Completed", StringComparison.OrdinalIgnoreCase),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.Residents.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"residents: {rows.Count}");
    }

    private async Task ImportProcessRecordingsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "process_recordings");
        if (path is null) return;

        var rows = new List<ProcessRecording>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new ProcessRecording
                {
                    ProcessRecordingId = ToInt(d, "recording_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    SessionDate = ToDateOnly(d, "session_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    SocialWorkerName = ToStr(d, "social_worker") ?? "",
                    SessionType = ToStr(d, "session_type") ?? "Individual",
                    SessionDurationMinutes = ToInt(d, "session_duration_minutes"),
                    EmotionalStateObserved = ToStr(d, "emotional_state_observed"),
                    EmotionalStateEnd = ToStr(d, "emotional_state_end"),
                    NarrativeSummary = ToStr(d, "session_narrative") ?? "",
                    InterventionsApplied = ToStr(d, "interventions_applied"),
                    FollowUpActions = ToStr(d, "follow_up_actions"),
                    ProgressNoted = ToBool(d, "progress_noted") ?? false,
                    ConcernsFlagged = ToBool(d, "concerns_flagged") ?? false,
                    ReferralMade = ToBool(d, "referral_made") ?? false,
                    NotesRestricted = ToStr(d, "notes_restricted"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.ProcessRecordings.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"process_recordings: {rows.Count}");
    }

    private async Task ImportHomeVisitationsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "home_visitations");
        if (path is null) return;

        var rows = new List<HomeVisitation>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new HomeVisitation
                {
                    HomeVisitationId = ToInt(d, "visitation_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    VisitDate = ToDateOnly(d, "visit_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    SocialWorkerName = ToStr(d, "social_worker"),
                    VisitType = ToStr(d, "visit_type") ?? "RoutineFollowUp",
                    LocationVisited = ToStr(d, "location_visited"),
                    FamilyMembersPresent = ToStr(d, "family_members_present"),
                    Purpose = ToStr(d, "purpose"),
                    Observations = ToStr(d, "observations"),
                    FamilyCooperationLevel = ToStr(d, "family_cooperation_level"),
                    SafetyConcernsNoted = ToBool(d, "safety_concerns_noted") ?? false,
                    FollowUpNeeded = ToBool(d, "follow_up_needed") ?? false,
                    FollowUpNotes = ToStr(d, "follow_up_notes"),
                    VisitOutcome = ToStr(d, "visit_outcome"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.HomeVisitations.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"home_visitations: {rows.Count}");
    }

    private async Task ImportEducationRecordsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "education_records");
        if (path is null) return;

        var rows = new List<EducationRecord>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new EducationRecord
                {
                    EducationRecordId = ToInt(d, "education_record_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    RecordDate = ToDateOnly(d, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    ProgramName = ToStr(d, "program_name") ?? "",
                    CourseName = ToStr(d, "course_name") ?? "",
                    EducationLevel = ToStr(d, "education_level") ?? "",
                    AttendanceStatus = ToStr(d, "attendance_status") ?? "",
                    AttendanceRate = ToDec(d, "attendance_rate"),
                    ProgressPercent = ToDec(d, "progress_percent"),
                    CompletionStatus = ToStr(d, "completion_status") ?? "",
                    GpaLikeScore = ToDec(d, "gpa_like_score"),
                    Notes = ToStr(d, "notes"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.EducationRecords.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"education_records: {rows.Count}");
    }

    private async Task ImportHealthRecordsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "health_wellbeing_records");
        if (path is null) return;

        var rows = new List<HealthWellbeingRecord>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new HealthWellbeingRecord
                {
                    HealthRecordId = ToInt(d, "health_record_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    RecordDate = ToDateOnly(d, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    WeightKg = ToDec(d, "weight_kg"),
                    HeightCm = ToDec(d, "height_cm"),
                    Bmi = ToDec(d, "bmi"),
                    NutritionScore = ToDec(d, "nutrition_score"),
                    SleepScore = ToDec(d, "sleep_score"),
                    EnergyScore = ToDec(d, "energy_score"),
                    GeneralHealthScore = ToDec(d, "general_health_score"),
                    MedicalCheckupDone = ToBool(d, "medical_checkup_done") ?? false,
                    DentalCheckupDone = ToBool(d, "dental_checkup_done") ?? false,
                    PsychologicalCheckupDone = ToBool(d, "psychological_checkup_done") ?? false,
                    MedicalNotesRestricted = ToStr(d, "medical_notes_restricted"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.HealthWellbeingRecords.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"health_wellbeing_records: {rows.Count}");
    }

    private async Task ImportInterventionPlansAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "intervention_plans");
        if (path is null) return;

        var rows = new List<InterventionPlan>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new InterventionPlan
                {
                    PlanId = ToInt(d, "plan_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    PlanCategory = ToStr(d, "plan_category") ?? "",
                    PlanDescription = ToStr(d, "plan_description") ?? "",
                    ServicesProvided = ToStr(d, "services_provided"),
                    TargetValue = ToDec(d, "target_value"),
                    TargetDate = ToDateOnly(d, "target_date"),
                    Status = ToStr(d, "status") ?? "Open",
                    CaseConferenceDate = ToDateOnly(d, "case_conference_date"),
                    CreatedAtUtc = ToDateTimeUtc(d, "created_at") ?? DateTime.UtcNow,
                    UpdatedAtUtc = ToDateTimeUtc(d, "updated_at") ?? DateTime.UtcNow,
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.InterventionPlans.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"intervention_plans: {rows.Count}");
    }

    private async Task ImportIncidentReportsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "incident_reports");
        if (path is null) return;

        var rows = new List<IncidentReport>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new IncidentReport
                {
                    IncidentId = ToInt(d, "incident_id") ?? 0,
                    ResidentId = ToInt(d, "resident_id") ?? 0,
                    SafehouseId = ToInt(d, "safehouse_id") ?? 0,
                    IncidentDate = ToDateOnly(d, "incident_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    IncidentType = ToStr(d, "incident_type") ?? "",
                    Severity = ToStr(d, "severity") ?? "",
                    Description = ToStr(d, "description") ?? "",
                    ResponseTaken = ToStr(d, "response_taken"),
                    Resolved = ToBool(d, "resolved") ?? false,
                    ResolutionDate = ToDateOnly(d, "resolution_date"),
                    ReportedBy = ToStr(d, "reported_by"),
                    FollowUpRequired = ToBool(d, "follow_up_required") ?? false,
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.IncidentReports.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"incident_reports: {rows.Count}");
    }

    private async Task ImportSafehouseMonthlyMetricsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "safehouse_monthly_metrics");
        if (path is null) return;

        var rows = new List<SafehouseMonthlyMetric>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new SafehouseMonthlyMetric
                {
                    MetricId = ToInt(d, "metric_id") ?? 0,
                    SafehouseId = ToInt(d, "safehouse_id") ?? 0,
                    MonthStart = ToDateOnly(d, "month_start") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    MonthEnd = ToDateOnly(d, "month_end") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    ActiveResidents = ToInt(d, "active_residents") ?? 0,
                    AvgEducationProgress = ToDec(d, "avg_education_progress"),
                    AvgHealthScore = ToDec(d, "avg_health_score"),
                    ProcessRecordingCount = ToInt(d, "process_recording_count") ?? 0,
                    HomeVisitationCount = ToInt(d, "home_visitation_count") ?? 0,
                    IncidentCount = ToInt(d, "incident_count") ?? 0,
                    Notes = ToStr(d, "notes"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.SafehouseMonthlyMetrics.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"safehouse_monthly_metrics: {rows.Count}");
    }

    private async Task ImportPublicImpactSnapshotsAsync(string dir, List<string> log, CancellationToken ct)
    {
        var path = PathFor(dir, "public_impact_snapshots");
        if (path is null) return;

        var rows = new List<PublicImpactSnapshot>();
        using (var reader = new StreamReader(path))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (ExpandoObject r in csv.GetRecords<ExpandoObject>())
            {
                var d = (IDictionary<string, object>)r;
                rows.Add(new PublicImpactSnapshot
                {
                    SnapshotId = ToInt(d, "snapshot_id") ?? 0,
                    SnapshotDate = ToDateOnly(d, "snapshot_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    Headline = ToStr(d, "headline") ?? "",
                    SummaryText = ToStr(d, "summary_text") ?? "",
                    MetricPayloadJson = ToStr(d, "metric_payload_json") ?? "{}",
                    IsPublished = ToBool(d, "is_published") ?? false,
                    PublishedAt = ToDateOnly(d, "published_at"),
                });
            }
        }

        if (rows.Count > 0)
        {
            await db.PublicImpactSnapshots.AddRangeAsync(rows, ct);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }

        log.Add($"public_impact_snapshots: {rows.Count}");
    }

    private static string? CombineLoc(string? city, string? prov)
    {
        if (string.IsNullOrWhiteSpace(city) && string.IsNullOrWhiteSpace(prov)) return null;
        return $"{city}, {prov}".Trim(' ', ',');
    }

    private static string? ToStr(IDictionary<string, object> d, string key)
    {
        foreach (var kv in d)
        {
            if (!string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase)) continue;
            if (kv.Value is null) return null;
            var s = kv.Value.ToString();
            return string.IsNullOrWhiteSpace(s) ? null : s;
        }

        return null;
    }

    private static int? ToInt(IDictionary<string, object> d, string key)
    {
        var s = ToStr(d, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        return int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var x) ? x : null;
    }

    private static decimal? ToDec(IDictionary<string, object> d, string key)
    {
        var s = ToStr(d, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        return decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var x) ? x : null;
    }

    private static bool? ToBool(IDictionary<string, object> d, string key)
    {
        var s = ToStr(d, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (bool.TryParse(s, out var b)) return b;
        if (s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase)) return true;
        if (s == "0" || s.Equals("false", StringComparison.OrdinalIgnoreCase)) return false;
        return null;
    }

    private static DateOnly? ToDateOnly(IDictionary<string, object> d, string key)
    {
        var s = ToStr(d, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateOnly.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d0)) return d0;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
            return DateOnly.FromDateTime(dt);
        return null;
    }

    private static DateTime? ToDateTimeUtc(IDictionary<string, object> d, string key)
    {
        var s = ToStr(d, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
            return dt.ToUniversalTime();
        return null;
    }
}

public sealed record ImportResult(bool Ok, string? Error, IReadOnlyList<string> Log);
