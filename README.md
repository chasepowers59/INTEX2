# INTEX W26 — Steps of Hope (Team Project)

This product is centered on a mission to support South Korean victims through a secure, data-driven leadership portal for safehouse operations, privacy-first donor impact reporting, and role-based staff workflows.

Stack (per case requirements):
- Frontend: React + TypeScript (Vite) deployed to Azure Static Web Apps
- API: ASP.NET Core (.NET 10) deployed to Azure App Service
- Database: Azure SQL Database

This repo contains:
- `api/Intex.Api` — backend API + auth/RBAC
- `web/` — React/TS frontend (SPA)
- `data/raw/` — place provided CSVs here (not committed)
- `ml-pipelines/` — Jupyter notebooks for IS455 (CSV or SQL-backed)

## Local dev (quick start)

Prereqs:
- .NET SDK 10.x
- Node 20+ (you have Node 22)
- An Azure SQL connection string (or local SQL Server)

### 1) API

Set environment variables:
- `ConnectionStrings__AppDb` = Azure SQL connection string
- `Jwt__Key` = long random secret (32+ chars)
- `Jwt__Issuer` = e.g. `intex-w26`
- `Jwt__Audience` = e.g. `intex-w26-web`
- `Cors__AllowedOrigins__0` = `http://localhost:5173`
- Optional seeded accounts (same mechanism as Azure; see `api/Intex.Api/appsettings.Development.json.example`):
  - `Seed__AdminEmail`, `Seed__AdminPassword`
  - `Seed__EmployeeEmail`, `Seed__EmployeePassword`
  - `Seed__DonorEmail`, `Seed__DonorPassword`
- If you change a seed password in config but the user already exists in the DB, set `Seed__SyncPasswords=true` for one run (then set back to `false`), or use `Seed__ClearLockouts=true` after failed login lockout.
- Optional `LighthouseImport__SourceDirectory` — default folder on the API host for Lighthouse CSV import (see below).

Copy `api/Intex.Api/appsettings.Development.json.example` to `api/Intex.Api/appsettings.Development.json` (gitignored) for local secrets. Passwords must satisfy `Identity:Password` in `appsettings.json` (minimum length 12, upper, lower, digit, non-alphanumeric, unique characters).

Run:
```bash
dotnet run --project api/Intex.Api
```

### 2) Web

Set:
- `VITE_API_BASE_URL` = `https://localhost:5001` (or whatever your API uses)

Run:
```bash
cd web
npm install
npm run dev
```

## Lighthouse CSV → SQL (full case data)

1. Apply EF migrations so Azure SQL (or local SQL) has the extended schema (`dotnet ef database update` from `api/Intex.Api`, or rely on `Database__AutoMigrate=true` on startup).
2. Put the provided CSVs in `data/raw/` on the machine that runs the API (same filenames as the case packet; headers are matched case-insensitively).
3. Sign in as **Admin** and open **`/app/admin/lighthouse-import`**, or call `POST /api/admin/lighthouse-import` with body `{ "sourceDirectory": null, "replace": true }` (optional `sourceDirectory` = absolute path on the API server). **Replace** clears operational case tables (not Identity accounts) then reloads from CSV.
4. On Azure App Service, upload CSVs to a path the API can read (e.g. Kudu `site/wwwroot/data/raw` or another folder) and set **`LighthouseImport__SourceDirectory`** to that path, or pass `sourceDirectory` in the POST body.

## ML (IS455) quick path

1. **Either** put CSVs in `data/raw/` **or** train directly from the database: set environment variable **`INTEX_ODBC`** to an ODBC connection string for the same SQL database the API uses, install **`pip install pyodbc`**, then run notebooks — they load tables via `pandas.read_sql` when `INTEX_ODBC` is set.
2. Run any notebook in `ml-pipelines/` top-to-bottom.
3. Export predictions JSON to `output/ml-predictions/<type>.json` using the helper in the notebook.
4. Import into the deployed API (admin-only):
   - `POST /api/ml/import?replace=true`
5. View outputs in the deployed web app:
   - `/app/ml` (Staff Portal → ML Insights)

## Deployment notes (Azure)

High-level:
1. Create Azure SQL Database + set firewall rules.
2. Deploy API to Azure App Service and configure App Settings (env vars).
3. Deploy `web/` to Azure Static Web Apps and set `VITE_API_BASE_URL` to your App Service URL.

Step-by-step: `docs/azure-deploy.md`
Operational validation checklist: `docs/operational-readiness.md`

**Deployed frontend + API (CORS):** The API only allows origins listed under `Cors:AllowedOrigins`. In Azure App Service set `Cors__AllowedOrigins__0` to your **exact** Static Web Apps URL (e.g. `https://nice-coast-0c9d7ab10.2.azurestaticapps.net`). If it is missing or still set to only `http://localhost:5173`, the browser blocks `fetch` with a CORS error. Confirm with `GET /health/info` (`corsAllowedOrigins` in the JSON).

Critical security notes for grading:
- CSP header is set in `web/staticwebapp.config.json`.
- API enforces RBAC so only `Admin` can CUD.
- Deletions require `?confirm=true` on DELETE endpoints.

## Accounts for grading

The case packet requires:
- Admin user (no MFA)
- Donor user (no MFA) connected to historical donations
- Any account (admin or donor) with MFA enabled (graders won’t log in; they’ll test enforcement)

Implementation note:
- This repo scaffolds username/password auth + roles via ASP.NET Identity.
- MFA and donor linking will be completed as part of Member 4’s work.
