# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **Steps of Hope** leadership portal. Three relevant pieces:

| Service | Path | Run command (from repo root) | Port |
|---|---|---|---|
| Backend API (.NET 10, ASP.NET Core) | `api/Intex.Api` | `dotnet run --project api/Intex.Api --launch-profile http` | http `5036` |
| Web frontend (React + Vite) | `web` | `npm --prefix web run dev -- --host` | `5173` |
| ML notebooks (optional) | `ml-pipelines` | see `README.md` "ML (IS455)" | n/a |

Standard build/test commands live in `README.md` and `web/package.json`. There is **no automated test project** in this repo and `web` has **no separate lint script** — `npm --prefix web run build` runs `tsc -b` and serves as the type-check/lint gate.

### Database (required, non-obvious)
- The API only supports **SQL Server** (`UseSqlServer` in `Program.cs`); there is **no SQLite/in-memory fallback**. A SQL Server instance must be running before starting the API or auth, migrations, and all data endpoints fail.
- SQL Server is installed natively (`/opt/mssql`) but **systemd is not the init system here**, so `systemctl` does not work. Start it by running the binary directly (it backgrounds best in a tmux session):
  ```bash
  sudo MSSQL_SA_PASSWORD='IntexDev!2026Strong' ACCEPT_EULA=Y MSSQL_PID=Developer /opt/mssql/bin/sqlservr
  ```
  It listens on `localhost:1433` (SA password `IntexDev!2026Strong`). Database files persist under `/var/opt/mssql`.
- On first `dotnet run` in Development the API auto-applies EF migrations, auto-imports the Lighthouse CSV demo dataset, and seeds demo accounts (`Database:AutoMigrate=true`, `LighthouseImport:AutoImportIfEmpty=true`, `Seed:DemoData=true`). This can take ~30s and emits a very large amount of EF SQL logging — that is normal, wait for `Now listening on: http://localhost:5036`.

### Local secrets / config (gitignored — recreate if missing)
These files are gitignored (so not in the PR) but are required for local dev:
- `api/Intex.Api/appsettings.Development.json` — connection string (`Server=localhost,1433;...;User Id=sa;Password=IntexDev!2026Strong;...`), `Jwt:Key` (≥32 chars), and `Seed` accounts. Seed passwords must satisfy the Identity policy (min length 14).
- `web/.env.local` — `VITE_API_BASE_URL=http://localhost:5036` (the frontend throws "Missing VITE_API_BASE_URL" without it).

### Seeded demo accounts (Development)
- Admin: `admin@example.com` / `AdminPass!2026xyz`
- Employee: `employee@example.com` / `EmployeePass!2026`
- Donor: `donor@example.com` / `DonorPass!2026xyz`

If you change a seed password in config but the user already exists in the DB, set `Seed:SyncPasswords=true` for one run; after a lockout use `Seed:ClearLockouts=true`.

### Startup order
1. Start SQL Server (command above) and wait for `SQL Server is now ready for client connections`.
2. Start the API (`dotnet run --project api/Intex.Api --launch-profile http`).
3. Start the web dev server (`npm --prefix web run dev -- --host`), then open `http://localhost:5173`.
