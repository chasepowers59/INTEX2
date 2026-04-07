using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class LighthouseFullData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MlPredictions",
                columns: table => new
                {
                    PredictionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PredictionType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MlPredictions", x => x.PredictionId);
                });

            migrationBuilder.CreateTable(
                name: "Partners",
                columns: table => new
                {
                    PartnerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PartnerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PartnerType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RoleType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ContactName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Region = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Partners", x => x.PartnerId);
                });

            migrationBuilder.CreateTable(
                name: "PublicImpactSnapshots",
                columns: table => new
                {
                    SnapshotId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SnapshotDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Headline = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SummaryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MetricPayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    PublishedAt = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicImpactSnapshots", x => x.SnapshotId);
                });

            migrationBuilder.CreateTable(
                name: "Safehouses",
                columns: table => new
                {
                    SafehouseId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SafehouseCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Region = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    City = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Province = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Country = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    OpenDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CapacityGirls = table.Column<int>(type: "int", nullable: false),
                    CapacityStaff = table.Column<int>(type: "int", nullable: false),
                    CurrentOccupancy = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Safehouses", x => x.SafehouseId);
                });

            migrationBuilder.CreateTable(
                name: "SocialMediaPosts",
                columns: table => new
                {
                    PostId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Platform = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    PlatformPostId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    PostUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DayOfWeek = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PostHour = table.Column<int>(type: "int", nullable: true),
                    PostType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    MediaType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Hashtags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NumHashtags = table.Column<int>(type: "int", nullable: true),
                    MentionsCount = table.Column<int>(type: "int", nullable: true),
                    HasCallToAction = table.Column<bool>(type: "bit", nullable: false),
                    CallToActionType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ContentTopic = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    SentimentTone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CaptionLength = table.Column<int>(type: "int", nullable: true),
                    FeaturesResidentStory = table.Column<bool>(type: "bit", nullable: false),
                    CampaignName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    IsBoosted = table.Column<bool>(type: "bit", nullable: false),
                    BoostBudgetPhp = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Impressions = table.Column<int>(type: "int", nullable: true),
                    Reach = table.Column<int>(type: "int", nullable: true),
                    Likes = table.Column<int>(type: "int", nullable: true),
                    Comments = table.Column<int>(type: "int", nullable: true),
                    Shares = table.Column<int>(type: "int", nullable: true),
                    Saves = table.Column<int>(type: "int", nullable: true),
                    ClickThroughs = table.Column<int>(type: "int", nullable: true),
                    VideoViews = table.Column<int>(type: "int", nullable: true),
                    EngagementRate = table.Column<decimal>(type: "decimal(18,6)", nullable: true),
                    ProfileVisits = table.Column<int>(type: "int", nullable: true),
                    DonationReferrals = table.Column<int>(type: "int", nullable: true),
                    EstimatedDonationValuePhp = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    FollowerCountAtPost = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialMediaPosts", x => x.PostId);
                });

            migrationBuilder.CreateTable(
                name: "Supporters",
                columns: table => new
                {
                    SupporterId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupporterType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RelationshipType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Region = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Country = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FirstDonationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AcquisitionChannel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Supporters", x => x.SupporterId);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PartnerAssignments",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PartnerId = table.Column<int>(type: "int", nullable: false),
                    SafehouseId = table.Column<int>(type: "int", nullable: true),
                    ProgramArea = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AssignmentStart = table.Column<DateOnly>(type: "date", nullable: true),
                    AssignmentEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    ResponsibilityNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartnerAssignments", x => x.AssignmentId);
                    table.ForeignKey(
                        name: "FK_PartnerAssignments_Partners_PartnerId",
                        column: x => x.PartnerId,
                        principalTable: "Partners",
                        principalColumn: "PartnerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PartnerAssignments_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Residents",
                columns: table => new
                {
                    ResidentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CaseControlNo = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    InternalCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    SafehouseId = table.Column<int>(type: "int", nullable: false),
                    CaseStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Sex = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: true),
                    BirthStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PlaceOfBirth = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Religion = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    CaseCategory = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    SubCatOrphaned = table.Column<bool>(type: "bit", nullable: true),
                    SubCatTrafficked = table.Column<bool>(type: "bit", nullable: true),
                    SubCatChildLabor = table.Column<bool>(type: "bit", nullable: true),
                    SubCatPhysicalAbuse = table.Column<bool>(type: "bit", nullable: true),
                    SubCatSexualAbuse = table.Column<bool>(type: "bit", nullable: true),
                    SubCatOsaec = table.Column<bool>(type: "bit", nullable: true),
                    SubCatCicl = table.Column<bool>(type: "bit", nullable: true),
                    SubCatAtRisk = table.Column<bool>(type: "bit", nullable: true),
                    SubCatStreetChild = table.Column<bool>(type: "bit", nullable: true),
                    SubCatChildWithHiv = table.Column<bool>(type: "bit", nullable: true),
                    IsPwd = table.Column<bool>(type: "bit", nullable: true),
                    PwdType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    HasSpecialNeeds = table.Column<bool>(type: "bit", nullable: true),
                    SpecialNeedsDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FamilyIs4ps = table.Column<bool>(type: "bit", nullable: true),
                    FamilySoloParent = table.Column<bool>(type: "bit", nullable: true),
                    FamilyIndigenous = table.Column<bool>(type: "bit", nullable: true),
                    FamilyParentPwd = table.Column<bool>(type: "bit", nullable: true),
                    FamilyInformalSettler = table.Column<bool>(type: "bit", nullable: true),
                    DateOfAdmission = table.Column<DateOnly>(type: "date", nullable: true),
                    AgeUponAdmission = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    PresentAge = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    LengthOfStay = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    ReferralSource = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ReferringAgencyPerson = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AssignedSocialWorker = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    InitialRiskLevel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    CurrentRiskLevel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    ReintegrationType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ReintegrationStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    DateClosed = table.Column<DateOnly>(type: "date", nullable: true),
                    NotesRestricted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SubCategory = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    AdmissionDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsReintegrated = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Residents", x => x.ResidentId);
                    table.ForeignKey(
                        name: "FK_Residents_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SafehouseMonthlyMetrics",
                columns: table => new
                {
                    MetricId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SafehouseId = table.Column<int>(type: "int", nullable: false),
                    MonthStart = table.Column<DateOnly>(type: "date", nullable: false),
                    MonthEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    ActiveResidents = table.Column<int>(type: "int", nullable: false),
                    AvgEducationProgress = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    AvgHealthScore = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    ProcessRecordingCount = table.Column<int>(type: "int", nullable: false),
                    HomeVisitationCount = table.Column<int>(type: "int", nullable: false),
                    IncidentCount = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SafehouseMonthlyMetrics", x => x.MetricId);
                    table.ForeignKey(
                        name: "FK_SafehouseMonthlyMetrics_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SupporterId = table.Column<int>(type: "int", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "Supporters",
                        principalColumn: "SupporterId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Contributions",
                columns: table => new
                {
                    ContributionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupporterId = table.Column<int>(type: "int", nullable: false),
                    ContributionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ContributionDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ChannelSource = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    EstimatedValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ImpactUnit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsRecurring = table.Column<bool>(type: "bit", nullable: false),
                    CampaignName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByPartnerId = table.Column<int>(type: "int", nullable: true),
                    ReferralPostId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contributions", x => x.ContributionId);
                    table.ForeignKey(
                        name: "FK_Contributions_Partners_CreatedByPartnerId",
                        column: x => x.CreatedByPartnerId,
                        principalTable: "Partners",
                        principalColumn: "PartnerId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Contributions_SocialMediaPosts_ReferralPostId",
                        column: x => x.ReferralPostId,
                        principalTable: "SocialMediaPosts",
                        principalColumn: "PostId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Contributions_Supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "Supporters",
                        principalColumn: "SupporterId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImpactAllocations",
                columns: table => new
                {
                    ImpactAllocationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupporterId = table.Column<int>(type: "int", nullable: false),
                    SnapshotId = table.Column<int>(type: "int", nullable: true),
                    AllocationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImpactAllocations", x => x.ImpactAllocationId);
                    table.ForeignKey(
                        name: "FK_ImpactAllocations_PublicImpactSnapshots_SnapshotId",
                        column: x => x.SnapshotId,
                        principalTable: "PublicImpactSnapshots",
                        principalColumn: "SnapshotId");
                    table.ForeignKey(
                        name: "FK_ImpactAllocations_Supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "Supporters",
                        principalColumn: "SupporterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CaseConferences",
                columns: table => new
                {
                    CaseConferenceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseConferences", x => x.CaseConferenceId);
                    table.ForeignKey(
                        name: "FK_CaseConferences_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EducationRecords",
                columns: table => new
                {
                    EducationRecordId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    RecordDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ProgramName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    CourseName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EducationLevel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AttendanceStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AttendanceRate = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    ProgressPercent = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    CompletionStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    GpaLikeScore = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EducationRecords", x => x.EducationRecordId);
                    table.ForeignKey(
                        name: "FK_EducationRecords_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HealthWellbeingRecords",
                columns: table => new
                {
                    HealthRecordId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    RecordDate = table.Column<DateOnly>(type: "date", nullable: false),
                    WeightKg = table.Column<decimal>(type: "decimal(9,2)", nullable: true),
                    HeightCm = table.Column<decimal>(type: "decimal(9,2)", nullable: true),
                    Bmi = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    NutritionScore = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    SleepScore = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    EnergyScore = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    GeneralHealthScore = table.Column<decimal>(type: "decimal(9,4)", nullable: true),
                    MedicalCheckupDone = table.Column<bool>(type: "bit", nullable: false),
                    DentalCheckupDone = table.Column<bool>(type: "bit", nullable: false),
                    PsychologicalCheckupDone = table.Column<bool>(type: "bit", nullable: false),
                    MedicalNotesRestricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthWellbeingRecords", x => x.HealthRecordId);
                    table.ForeignKey(
                        name: "FK_HealthWellbeingRecords_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HomeVisitations",
                columns: table => new
                {
                    HomeVisitationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SocialWorkerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    VisitType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    LocationVisited = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    FamilyMembersPresent = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Observations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FamilyCooperationLevel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    SafetyConcernsNoted = table.Column<bool>(type: "bit", nullable: false),
                    FollowUpNeeded = table.Column<bool>(type: "bit", nullable: false),
                    FollowUpNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisitOutcome = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    SafetyConcerns = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FollowUpActions = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomeVisitations", x => x.HomeVisitationId);
                    table.ForeignKey(
                        name: "FK_HomeVisitations_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IncidentReports",
                columns: table => new
                {
                    IncidentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    SafehouseId = table.Column<int>(type: "int", nullable: false),
                    IncidentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IncidentType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResponseTaken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Resolved = table.Column<bool>(type: "bit", nullable: false),
                    ResolutionDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReportedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    FollowUpRequired = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReports", x => x.IncidentId);
                    table.ForeignKey(
                        name: "FK_IncidentReports_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId");
                    table.ForeignKey(
                        name: "FK_IncidentReports_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "SafehouseId");
                });

            migrationBuilder.CreateTable(
                name: "InterventionPlans",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    PlanCategory = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    PlanDescription = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ServicesProvided = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CaseConferenceDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionPlans", x => x.PlanId);
                    table.ForeignKey(
                        name: "FK_InterventionPlans_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcessRecordings",
                columns: table => new
                {
                    ProcessRecordingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResidentId = table.Column<int>(type: "int", nullable: false),
                    SessionDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SocialWorkerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SessionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    SessionDurationMinutes = table.Column<int>(type: "int", nullable: true),
                    EmotionalStateObserved = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    EmotionalStateEnd = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    NarrativeSummary = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InterventionsApplied = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FollowUpActions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProgressNoted = table.Column<bool>(type: "bit", nullable: false),
                    ConcernsFlagged = table.Column<bool>(type: "bit", nullable: false),
                    ReferralMade = table.Column<bool>(type: "bit", nullable: false),
                    NotesRestricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessRecordings", x => x.ProcessRecordingId);
                    table.ForeignKey(
                        name: "FK_ProcessRecordings_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DonationAllocations",
                columns: table => new
                {
                    DonationAllocationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContributionId = table.Column<int>(type: "int", nullable: false),
                    SafehouseId = table.Column<int>(type: "int", nullable: false),
                    ProgramArea = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AmountAllocated = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AllocationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AllocationNotes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonationAllocations", x => x.DonationAllocationId);
                    table.ForeignKey(
                        name: "FK_DonationAllocations_Contributions_ContributionId",
                        column: x => x.ContributionId,
                        principalTable: "Contributions",
                        principalColumn: "ContributionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DonationAllocations_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InKindDonationItems",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContributionId = table.Column<int>(type: "int", nullable: false),
                    ItemName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ItemCategory = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EstimatedUnitValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IntendedUse = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ReceivedCondition = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InKindDonationItems", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_InKindDonationItems_Contributions_ContributionId",
                        column: x => x.ContributionId,
                        principalTable: "Contributions",
                        principalColumn: "ContributionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_SupporterId",
                table: "AspNetUsers",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CaseConferences_ResidentId",
                table: "CaseConferences",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_Contributions_CreatedByPartnerId",
                table: "Contributions",
                column: "CreatedByPartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Contributions_ReferralPostId",
                table: "Contributions",
                column: "ReferralPostId");

            migrationBuilder.CreateIndex(
                name: "IX_Contributions_SupporterId",
                table: "Contributions",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "IX_DonationAllocations_ContributionId",
                table: "DonationAllocations",
                column: "ContributionId");

            migrationBuilder.CreateIndex(
                name: "IX_DonationAllocations_SafehouseId",
                table: "DonationAllocations",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_EducationRecords_ResidentId",
                table: "EducationRecords",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_HealthWellbeingRecords_ResidentId",
                table: "HealthWellbeingRecords",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_HomeVisitations_ResidentId",
                table: "HomeVisitations",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_ImpactAllocations_SnapshotId_Category",
                table: "ImpactAllocations",
                columns: new[] { "SnapshotId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_ImpactAllocations_SupporterId_AllocationDate",
                table: "ImpactAllocations",
                columns: new[] { "SupporterId", "AllocationDate" });

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_ResidentId",
                table: "IncidentReports",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_SafehouseId",
                table: "IncidentReports",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_InKindDonationItems_ContributionId",
                table: "InKindDonationItems",
                column: "ContributionId");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionPlans_ResidentId",
                table: "InterventionPlans",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_MlPredictions_PredictionType_CreatedAtUtc",
                table: "MlPredictions",
                columns: new[] { "PredictionType", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_MlPredictions_PredictionType_EntityType_EntityId",
                table: "MlPredictions",
                columns: new[] { "PredictionType", "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_PartnerAssignments_PartnerId",
                table: "PartnerAssignments",
                column: "PartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_PartnerAssignments_SafehouseId",
                table: "PartnerAssignments",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessRecordings_ResidentId",
                table: "ProcessRecordings",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_PublicImpactSnapshots_SnapshotDate",
                table: "PublicImpactSnapshots",
                column: "SnapshotDate");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_SafehouseId",
                table: "Residents",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_SafehouseMonthlyMetrics_SafehouseId_MonthStart",
                table: "SafehouseMonthlyMetrics",
                columns: new[] { "SafehouseId", "MonthStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Safehouses_SafehouseCode",
                table: "Safehouses",
                column: "SafehouseCode");

            migrationBuilder.CreateIndex(
                name: "IX_SocialMediaPosts_CreatedAt",
                table: "SocialMediaPosts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Supporters_Email",
                table: "Supporters",
                column: "Email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "CaseConferences");

            migrationBuilder.DropTable(
                name: "DonationAllocations");

            migrationBuilder.DropTable(
                name: "EducationRecords");

            migrationBuilder.DropTable(
                name: "HealthWellbeingRecords");

            migrationBuilder.DropTable(
                name: "HomeVisitations");

            migrationBuilder.DropTable(
                name: "ImpactAllocations");

            migrationBuilder.DropTable(
                name: "IncidentReports");

            migrationBuilder.DropTable(
                name: "InKindDonationItems");

            migrationBuilder.DropTable(
                name: "InterventionPlans");

            migrationBuilder.DropTable(
                name: "MlPredictions");

            migrationBuilder.DropTable(
                name: "PartnerAssignments");

            migrationBuilder.DropTable(
                name: "ProcessRecordings");

            migrationBuilder.DropTable(
                name: "SafehouseMonthlyMetrics");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "PublicImpactSnapshots");

            migrationBuilder.DropTable(
                name: "Contributions");

            migrationBuilder.DropTable(
                name: "Residents");

            migrationBuilder.DropTable(
                name: "Partners");

            migrationBuilder.DropTable(
                name: "SocialMediaPosts");

            migrationBuilder.DropTable(
                name: "Supporters");

            migrationBuilder.DropTable(
                name: "Safehouses");
        }
    }
}
