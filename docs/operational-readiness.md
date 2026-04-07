# Operational Readiness Checklist

This checklist helps confirm the deployed React + .NET solution is ready for demos/grading without changing database schema.

## 1) Auth and Role Access

- `POST /api/auth/login` works with both `username` and `email` payload keys.
- Admin account can open:
  - `/app/dashboard`
  - `/app/reports`
  - `/app/admin/users`
  - `/app/admin/lighthouse-import`
- Donor account can open:
  - `/app/donor`
  - `/give`
- Donor account cannot open staff routes (should be blocked by UI/route guards and API policy checks).

## 2) Security Baseline

- Static Web App headers are present in `web/staticwebapp.config.json`:
  - CSP
  - HSTS
  - X-Frame-Options
  - Referrer-Policy
  - Permissions-Policy
- API `Jwt__Key` is 32+ chars (`/health/info` -> `jwtKeyConfigured: true`).
- CORS allowlist includes only expected frontend origins (`/health/info` -> `corsAllowedOrigins`).
- API errors include `traceId` and correlation header (`X-Correlation-Id`) for log lookup.

## 3) Data Safety Controls

- For production-ish stability with current data loaded:
  - `Database__AutoMigrate = false`
  - `LighthouseImport__AutoImportIfEmpty = false`
- Avoid accidental data reset:
  - Do not run `POST /api/admin/lighthouse-import` with `{ "replace": true }` unless intentional.

## 4) Dashboard and API Smoke Tests

Run after deploy:

1. `GET /health`
2. `GET /health/info`
3. `GET /health/migrations`
4. `GET /api/analytics/overview` (staff token)
5. `GET /api/analytics/ops-alerts?take=10` (staff token)
6. `GET /api/analytics/program-insights` (staff token)
7. `GET /api/public/impact-highlights` (anonymous)

Expected:
- No 500 responses.
- Dashboard renders even if one analytics section degrades.

## 5) ML Pipeline Operational Path

Notebooks live in `ml-pipelines/`. Minimum path:

1. Set `INTEX_ODBC` to your SQL DB (or use CSV in `data/raw/`).
2. Run target notebooks end-to-end and export prediction JSON.
3. Import predictions via:
   - `POST /api/ml/import?replace=true` (admin token)
4. Verify output pages:
   - `/app/ml`
   - `/app/action-center`

Recommended first prediction types:
- `resident_incident_30d`
- `donor_lapse_90d`

## 6) Frontend Requirement Coverage (React)

- Public pages: Home, About, Contact, Give, Impact, Privacy.
- Donor flow: Register, Login, Donor Portal, Give CTA.
- Staff flow: Dashboard, Reports, Action Center, ML Insights, Admin pages.
- Responsive support: table wrapping and mobile layouts in `web/src/styles.css`.

## 7) Deployment Sign-off

- API and web builds succeed:
  - `dotnet build api/Intex.Api/Intex.Api.csproj`
  - `npm run build` in `web/`
- Record final URLs and tested account roles for grading handoff.

## 8) IS414 Advanced Features

- Docker deployment artifacts are available:
  - `api/Intex.Api/Dockerfile`
  - `web/Dockerfile`
  - `docker-compose.yml`
- Advanced security implementation notes (third-party auth, MFA, sanitization callout):
  - `docs/is414-advanced-security.md`
