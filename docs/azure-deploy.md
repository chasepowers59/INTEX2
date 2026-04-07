# Azure Deployment (SWA + App Service + Azure SQL)

Region guidance (team decision):
- Since you’re operating in **South Korea**, prefer creating resources in **Korea Central** (or the closest available region you have access to) to reduce latency.

## 1) Azure SQL Database

1. Create **Azure SQL server + database**.
2. Set firewall:
   - Allow your client IP for local dev.
   - Allow Azure services if needed for App Service connectivity.
3. Copy the connection string and set it on the API as `ConnectionStrings__AppDb`.

### Stuck with only two tables? (`__EFMigrationsHistory` + `ImpactAllocations`)

An older build created a **minimal** `ImpactAllocations` table with raw SQL **before** EF migrations finished. SQL Server then blocked the real migration (table already exists), so you never got `AspNetUsers`, `Supporters`, etc.

**Fix (empty / school DB only — deletes that patch table and migration history):**

1. In **Azure Portal → your SQL database → Query editor** (or SSMS), connect and run:

```sql
IF OBJECT_ID(N'dbo.ImpactAllocations', N'U') IS NOT NULL
    DROP TABLE dbo.ImpactAllocations;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
    DROP TABLE dbo.__EFMigrationsHistory;
```

2. **Restart** the App Service. On startup it will run **`MigrateAsync`** and create the full schema.

3. Confirm with `GET https://<your-api>/health/schema` (expect `AspNetUsers`: true, etc.).

Alternatively, from your PC (firewall allowing your IP):

`dotnet ef database update --project api/Intex.Api/Intex.Api.csproj --connection "<same as ConnectionStrings__AppDb>"`

## 2) API — Azure App Service

1. Create an **App Service** (Linux or Windows is fine) for the API.
2. Deploy `api/Intex.Api` (GitHub deploy or Zip deploy).
3. In **Configuration → Application settings**, set:
   - `ConnectionStrings__AppDb` = (Azure SQL connection string)
   - `Jwt__Key` = long random secret (**32+ characters**; without this, login returns HTTP 500/503 after a correct password)
   - `Jwt__Issuer` = `intex-w26`
   - `Jwt__Audience` = `intex-w26-web`
   - `Cors__AllowedOrigins__0` = your **exact** Static Web Apps site URL (must match what the browser sends as `Origin`, including `https://` and **no trailing slash**).
     - Classic hostname: `https://<app-name>.azurestaticapps.net`
     - Newer hostnames often look like: `https://<label>.2.azurestaticapps.net` (e.g. `https://nice-coast-0c9d7ab10.2.azurestaticapps.net`)
   - Optional: `Cors__AllowedOrigins__1` = `http://localhost:5173` if you want a published API to accept requests from local Vite while debugging.

   **If login works locally but the deployed site shows a CORS error**, the SWA URL is missing or wrong in App Service. Open `GET https://<your-api>/health/info` and check `corsAllowedOrigins` — it must list your SWA origin.

4. Verify connectivity:
   - API `GET /health` should return `{ "status": "ok" }`
   - API `GET /health/db` should return `200` when SQL is reachable (and `503` when not)
   - `GET /health/info` — shows `jwtKeyUtf8Bytes` / `jwtKeyConfigured` (not the secret) and CORS origins
   - `GET /health/migrations` — **`pending` must be empty** after deploy; if not, run `dotnet ef database update` against this SQL database
   - `GET /health/schema` — **`AspNetUsers` / `Supporters` should be `true`**; if false, migrations never applied to this DB

5. Seed users (all use the same startup path in `SeedData`):

   | App Service setting | Purpose |
   | --- | --- |
   | `Seed__AdminEmail`, `Seed__AdminPassword` | Admin account (recommended for first login) |
   | `Seed__EmployeeEmail`, `Seed__EmployeePassword` | Optional convenience employee |
   | `Seed__DonorEmail`, `Seed__DonorPassword` | Optional convenience donor (link `SupporterId` in `/app/admin/users`) |
   | `Seed__SyncPasswords` = `true` or `false` | When `true`, **overwrites** passwords for **existing** users that match configured seed emails (use after changing App Service passwords or fixing a stale hash). **Turn off** in production unless you intend this. |
   | `Seed__ClearLockouts` = `true` or `false` | When `true`, clears Identity lockout and failed-attempt count for each configured seed email on startup (use if login fails after too many bad attempts). |

   After changing seed passwords in Azure, either set `Seed__SyncPasswords` to `true` for **one** restart (then set back to `false`), or delete the user in the database and restart so the user is recreated.

   Sign in at `/login` with the **email** as username (or email). Then use `/app/admin/users` for additional accounts.

   **Donor portal demo:** If `Seed__DonorEmail` / `Seed__DonorPassword` are set and `Seed__DemoData` is `true`, the API creates a `Supporters` row (matching that email), links `AspNetUsers.SupporterId`, and inserts sample contributions and impact allocations so `/app/donor` shows data without manual steps.

6. Other useful settings:

   - `Database__AutoMigrate` = `true` (set `false` later if you do not want automatic migrations on startup)
   - `LighthouseImport__SourceDirectory` = absolute path on the App Service VM where CSVs live (e.g. after uploading via Kudu). Admins can also pass `sourceDirectory` in `POST /api/admin/lighthouse-import`. Use the web page **`/app/admin/lighthouse-import`** (Admin role) for the same operation.

7. **Lighthouse / full case data:** After deploy, ensure migrations ran, upload CSVs to the folder referenced by `LighthouseImport__SourceDirectory` (or use the request body path), then run import with **`replace: true`** once for a clean load. Identity users are not deleted; operational tables are cleared when replacing.

## Debugging (when something breaks)

App Service (API) troubleshooting checklist:
- Turn on **Application logging (Filesystem)** temporarily and use **Log stream**.
- Hit `GET /health/info` to verify the API is deployed and sees CORS + connection string.
- Hit `GET /health/db` to verify SQL connectivity.
- Every API response includes `X-Correlation-Id` and `/health` returns a `traceId` you can match in logs.

Do not leave `ASPNETCORE_ENVIRONMENT=Development` enabled for grading; use it temporarily only.

- Log stream: if a seed account is skipped, look for `Skipping seed for …` (missing email/password). If seeding throws, the API may still start in degraded mode—check logs for `Failed seeding user` / Identity error codes (often password policy).

**API final checks:**

   - `https://<your-api>.azurewebsites.net/health` returns `{ "status": "ok" }`.
   - HTTPS: App Service should have **HTTPS Only** enabled.

## 3) Frontend — Azure Static Web Apps

1. Create an **Azure Static Web App** connected to your GitHub repo.
2. Set:
   - App location: `web`
   - Output location: `dist`
3. Add SWA environment variable:
   - `VITE_API_BASE_URL` = `https://<your-api>.azurewebsites.net`
4. Confirm:
   - `web/staticwebapp.config.json` includes CSP + HSTS headers.
   - `Privacy Policy` link is visible in the footer.
   - Cookie consent banner appears on first visit.
   - ML Insights page is reachable after login: `/app/ml`

## 4) Required URLs for final submission

You will submit:
- Website URL (SWA)
- GitHub repo + branch
- Video URLs (IS413 / IS414 / IS455)
- Notebook URLs or paths in repo (`ml-pipelines/`)
