using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ImpactAllocationContributionLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ContributionId",
                table: "ImpactAllocations",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImpactAllocations_ContributionId",
                table: "ImpactAllocations",
                column: "ContributionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ImpactAllocations_Contributions_ContributionId",
                table: "ImpactAllocations",
                column: "ContributionId",
                principalTable: "Contributions",
                principalColumn: "ContributionId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ImpactAllocations_Contributions_ContributionId",
                table: "ImpactAllocations");

            migrationBuilder.DropIndex(
                name: "IX_ImpactAllocations_ContributionId",
                table: "ImpactAllocations");

            migrationBuilder.DropColumn(
                name: "ContributionId",
                table: "ImpactAllocations");
        }
    }
}
