from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

import pyodbc


FIRST_NAMES = [
    "Alden", "Bianca", "Carlo", "Diana", "Elena", "Felix", "Gia", "Hector", "Ivy", "Janelle",
    "Kara", "Lance", "Mara", "Nico", "Olive", "Paolo", "Quinn", "Rhea", "Soren", "Tala",
    "Uriel", "Vera", "Wes", "Xena", "Yna", "Zane", "Amelia", "Brent", "Celine", "Darius",
]

LAST_NAMES = [
    "Alcantara", "Bautista", "Cruz", "Dela Rosa", "Espino", "Fernandez", "Garcia", "Hernandez",
    "Ignacio", "Joaquin", "Lopez", "Mendoza", "Navarro", "Ocampo", "Panganiban", "Quinto",
    "Reyes", "Santos", "Torres", "Valdez", "Yap", "Zamora", "Ramos", "Salazar", "Aguilar",
]

REGIONS = ["Luzon", "Visayas", "Mindanao"]
COUNTRIES = ["Philippines", "Philippines", "Philippines", "USA", "Canada", "Australia"]
CHANNELS = ["Website", "WordOfMouth", "SocialMedia", "Event", "PartnerReferral", "Church"]
CONTRIBUTION_CHANNELS = ["Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"]
CAMPAIGNS = [
    "General Fund",
    "Safe Shelter",
    "Education Support",
    "Counseling and Wellbeing",
    "Reintegration Planning",
    "Nutrition Support",
]
PROGRAM_AREAS = ["Operations", "Education", "Wellbeing", "Transport", "Outreach", "Maintenance"]
IMPACT_CATEGORIES = ["Counseling", "Education", "Health", "Shelter", "Food", "Transport"]
CASE_TOPICS = [
    "Weekly case review",
    "Reintegration planning",
    "Safety check-in",
    "Education follow-up",
    "Clinical coordination",
    "Family tracing update",
]


def quantize_php(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class SupporterSeed:
    first_name: str
    last_name: str
    full_name: str
    email: str
    region: str
    country: str
    acquisition_channel: str
    first_donation_date: date


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed synthetic dashboard data into Azure SQL.")
    parser.add_argument("--server", required=True)
    parser.add_argument("--database", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--odbc-driver", default="ODBC Driver 17 for SQL Server")
    parser.add_argument("--supporters", type=int, default=120)
    parser.add_argument("--min-contributions", type=int, default=2)
    parser.add_argument("--max-contributions", type=int, default=5)
    parser.add_argument("--completed-conferences-per-resident", type=int, default=2)
    parser.add_argument("--upcoming-conferences-per-resident", type=int, default=1)
    parser.add_argument("--seed", type=int, default=4552026)
    return parser.parse_args()


def connection_string(args: argparse.Namespace) -> str:
    return (
        f"Driver={{{args.odbc_driver}}};"
        f"Server=tcp:{args.server},1433;"
        f"Database={args.database};"
        f"Uid={args.user};"
        f"Pwd={args.password};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=120;"
    )


def fetch_single_column(cursor: pyodbc.Cursor, sql: str) -> list[int]:
    return [int(row[0]) for row in cursor.execute(sql).fetchall()]


def create_backups(cursor: pyodbc.Cursor, run_tag: str) -> None:
    for table in ("Supporters", "Contributions", "DonationAllocations", "ImpactAllocations", "CaseConferences", "MlPredictions"):
        backup_table = f"{table}_Backup_{run_tag}"
        cursor.execute(
            f"""
            IF OBJECT_ID(N'dbo.{backup_table}', N'U') IS NOT NULL
                THROW 50000, 'Backup table dbo.{backup_table} already exists.', 1;
            SELECT * INTO dbo.{backup_table} FROM dbo.{table};
            """
        )


def build_supporter_seed(index: int, run_tag: str, rng: random.Random) -> SupporterSeed:
    first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
    last_name = LAST_NAMES[(index * 3) % len(LAST_NAMES)]
    suffix = f"{run_tag}-{index + 1:03d}"
    full_name = f"{first_name} {last_name} {suffix}"
    email = f"synthetic+{run_tag}-{index + 1:03d}@dashboard.local"
    first_donation_date = date.today() - timedelta(days=rng.randint(70, 540))
    return SupporterSeed(
        first_name=first_name,
        last_name=last_name,
        full_name=full_name,
        email=email,
        region=rng.choice(REGIONS),
        country=rng.choice(COUNTRIES),
        acquisition_channel=rng.choice(CHANNELS),
        first_donation_date=first_donation_date,
    )


def insert_supporters(
    cursor: pyodbc.Cursor,
    args: argparse.Namespace,
    run_tag: str,
    rng: random.Random,
) -> list[tuple[int, SupporterSeed]]:
    inserted: list[tuple[int, SupporterSeed]] = []
    for idx in range(args.supporters):
        seed = build_supporter_seed(idx, run_tag, rng)
        supporter_id = int(
            cursor.execute(
                """
                INSERT INTO dbo.Supporters
                    (SupporterType, DisplayName, FirstName, LastName, Region, Country, Email, Status,
                     FirstDonationDate, AcquisitionChannel, CreatedAtUtc, FullName, IsActive)
                OUTPUT INSERTED.SupporterId
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                "MonetaryDonor",
                seed.full_name,
                seed.first_name,
                seed.last_name,
                seed.region,
                seed.country,
                seed.email,
                "Active",
                seed.first_donation_date,
                seed.acquisition_channel,
                datetime.now(UTC),
                seed.full_name,
                True,
            ).fetchone()[0]
        )
        inserted.append((supporter_id, seed))
    return inserted


def contribution_amount(rng: random.Random) -> Decimal:
    if rng.random() < 0.15:
        return quantize_php(Decimal(rng.randint(12000, 40000)))
    if rng.random() < 0.45:
        return quantize_php(Decimal(rng.randint(3000, 12000)))
    return quantize_php(Decimal(rng.randint(500, 3000)))


def insert_contributions_and_allocations(
    cursor: pyodbc.Cursor,
    inserted_supporters: list[tuple[int, SupporterSeed]],
    partner_ids: list[int],
    post_ids: list[int],
    safehouse_ids: list[int],
    snapshot_ids: list[int],
    args: argparse.Namespace,
    run_tag: str,
    rng: random.Random,
) -> tuple[int, int, int]:
    contribution_count = 0
    allocation_count = 0
    impact_count = 0

    for supporter_id, seed in inserted_supporters:
        pattern = rng.choices(
            population=["recent", "steady", "at_risk"],
            weights=[0.4, 0.35, 0.25],
            k=1,
        )[0]
        contribution_total = rng.randint(args.min_contributions, args.max_contributions)
        base_date = seed.first_donation_date
        last_offset = {
            "recent": rng.randint(0, 20),
            "steady": rng.randint(21, 60),
            "at_risk": rng.randint(120, 260),
        }[pattern]
        last_date = date.today() - timedelta(days=last_offset)
        step_days = max(21, (last_date - base_date).days // max(1, contribution_total - 1))
        contribution_dates = [
            min(last_date, base_date + timedelta(days=step_days * idx))
            for idx in range(contribution_total)
        ]
        contribution_dates[-1] = last_date

        for idx, contribution_date in enumerate(contribution_dates):
            channel_source = rng.choice(CONTRIBUTION_CHANNELS)
            partner_id = rng.choice(partner_ids) if partner_ids and channel_source == "PartnerReferral" else None
            referral_post_id = rng.choice(post_ids) if post_ids and channel_source == "SocialMedia" else None
            campaign_name = CAMPAIGNS[(idx + supporter_id) % len(CAMPAIGNS)]
            amount = contribution_amount(rng)
            note = f"Synthetic dashboard seed {run_tag}"

            contribution_id = int(
                cursor.execute(
                    """
                    INSERT INTO dbo.Contributions
                        (SupporterId, ContributionType, ContributionDate, ChannelSource, Currency, Amount,
                         EstimatedValue, ImpactUnit, IsRecurring, CampaignName, Notes, CreatedByPartnerId, ReferralPostId)
                    OUTPUT INSERTED.ContributionId
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    supporter_id,
                    "Monetary",
                    contribution_date,
                    channel_source,
                    "PHP",
                    amount,
                    None,
                    None,
                    idx == 0 and rng.random() < 0.3,
                    campaign_name,
                    note,
                    partner_id,
                    referral_post_id,
                ).fetchone()[0]
            )
            contribution_count += 1

            split_count = rng.randint(1, 3)
            weights = [Decimal(rng.randint(1, 100)) for _ in range(split_count)]
            total_weight = sum(weights)
            allocated_so_far = Decimal("0.00")

            for split_idx in range(split_count):
                if split_idx == split_count - 1:
                    split_amount = quantize_php(amount - allocated_so_far)
                else:
                    split_amount = quantize_php(amount * weights[split_idx] / total_weight)
                    allocated_so_far += split_amount
                if split_amount <= Decimal("0.00"):
                    continue

                cursor.execute(
                    """
                    INSERT INTO dbo.DonationAllocations
                        (ContributionId, SafehouseId, ProgramArea, AmountAllocated, AllocationDate, AllocationNotes)
                    VALUES
                        (?, ?, ?, ?, ?, ?)
                    """,
                    contribution_id,
                    rng.choice(safehouse_ids),
                    rng.choice(PROGRAM_AREAS),
                    split_amount,
                    contribution_date,
                    f"Synthetic allocation {run_tag}",
                )
                allocation_count += 1

            impact_rows = rng.randint(1, 2)
            impact_weights = [Decimal(rng.randint(1, 100)) for _ in range(impact_rows)]
            impact_total_weight = sum(impact_weights)
            impact_allocated = Decimal("0.00")

            for impact_idx in range(impact_rows):
                if impact_idx == impact_rows - 1:
                    impact_amount = quantize_php(amount - impact_allocated)
                else:
                    impact_amount = quantize_php(amount * impact_weights[impact_idx] / impact_total_weight)
                    impact_allocated += impact_amount
                if impact_amount <= Decimal("0.00"):
                    continue

                cursor.execute(
                    """
                    INSERT INTO dbo.ImpactAllocations
                        (SupporterId, ContributionId, SnapshotId, AllocationDate, Category, Amount, Currency, Notes, CreatedAtUtc)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    supporter_id,
                    contribution_id,
                    rng.choice(snapshot_ids) if snapshot_ids and rng.random() < 0.85 else None,
                    contribution_date,
                    rng.choice(IMPACT_CATEGORIES),
                    impact_amount,
                    "PHP",
                    f"Synthetic impact allocation {run_tag}",
                    datetime.now(UTC),
                )
                impact_count += 1

    return contribution_count, allocation_count, impact_count


def insert_case_conferences(
    cursor: pyodbc.Cursor,
    active_resident_ids: list[int],
    args: argparse.Namespace,
    run_tag: str,
    rng: random.Random,
) -> int:
    count = 0
    now = datetime.now(UTC).replace(microsecond=0)

    for resident_id in active_resident_ids:
        for past_idx in range(args.completed_conferences_per_resident):
            scheduled_at = now - timedelta(days=rng.randint(7, 120), hours=rng.randint(1, 8))
            cursor.execute(
                """
                INSERT INTO dbo.CaseConferences
                    (ResidentId, ScheduledAtUtc, Topic, Notes, IsCompleted)
                VALUES
                    (?, ?, ?, ?, ?)
                """,
                resident_id,
                scheduled_at,
                CASE_TOPICS[(resident_id + past_idx) % len(CASE_TOPICS)],
                f"Completed synthetic conference {run_tag}",
                True,
            )
            count += 1

        for upcoming_idx in range(args.upcoming_conferences_per_resident):
            scheduled_at = now + timedelta(days=rng.randint(1, 14), hours=rng.randint(1, 8))
            cursor.execute(
                """
                INSERT INTO dbo.CaseConferences
                    (ResidentId, ScheduledAtUtc, Topic, Notes, IsCompleted)
                VALUES
                    (?, ?, ?, ?, ?)
                """,
                resident_id,
                scheduled_at,
                CASE_TOPICS[(resident_id + upcoming_idx + 2) % len(CASE_TOPICS)],
                f"Upcoming synthetic conference {run_tag}",
                False,
            )
            count += 1

    return count


def main() -> None:
    args = parse_args()
    if args.min_contributions < 1 or args.max_contributions < args.min_contributions:
        raise ValueError("Contribution bounds are invalid.")

    rng = random.Random(args.seed)
    run_tag = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    cnx = pyodbc.connect(connection_string(args), timeout=120)
    cnx.autocommit = False

    try:
        cursor = cnx.cursor()
        create_backups(cursor, run_tag)

        partner_ids = fetch_single_column(cursor, "SELECT PartnerId FROM dbo.Partners")
        post_ids = fetch_single_column(cursor, "SELECT PostId FROM dbo.SocialMediaPosts")
        safehouse_ids = fetch_single_column(cursor, "SELECT SafehouseId FROM dbo.Safehouses WHERE IsActive = 1")
        snapshot_ids = fetch_single_column(cursor, "SELECT SnapshotId FROM dbo.PublicImpactSnapshots WHERE IsPublished = 1")
        active_resident_ids = fetch_single_column(cursor, "SELECT ResidentId FROM dbo.Residents WHERE CaseStatus = 'Active'")

        inserted_supporters = insert_supporters(cursor, args, run_tag, rng)
        contribution_count, allocation_count, impact_count = insert_contributions_and_allocations(
            cursor=cursor,
            inserted_supporters=inserted_supporters,
            partner_ids=partner_ids,
            post_ids=post_ids,
            safehouse_ids=safehouse_ids,
            snapshot_ids=snapshot_ids,
            args=args,
            run_tag=run_tag,
            rng=rng,
        )
        conference_count = insert_case_conferences(cursor, active_resident_ids, args, run_tag, rng)

        cnx.commit()

        print(f"run_tag={run_tag}")
        print(f"supporters_inserted={len(inserted_supporters)}")
        print(f"contributions_inserted={contribution_count}")
        print(f"donation_allocations_inserted={allocation_count}")
        print(f"impact_allocations_inserted={impact_count}")
        print(f"case_conferences_inserted={conference_count}")
    except Exception:
        cnx.rollback()
        raise
    finally:
        cnx.close()


if __name__ == "__main__":
    main()
