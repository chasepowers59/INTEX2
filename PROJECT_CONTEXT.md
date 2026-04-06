# Project Context (Read Me First)

This file is a quick “memory” for future teammates (and AI assistants) so work stays aligned with INTEX W26 requirements and grading.

## What we’re building

Product: **Sanctuary Leadership Portal** for a safehouse nonprofit.

Operating location assumption for this team/project:
- **South Korea** (use KR locale conventions where relevant: time zone, date/time formats, and Azure region selection).

Primary users (personas used for IS401):
- **Admin (leadership)**: full operational control + create/update/delete (CUD) data + KPI oversight.
- **Donor (supporter)**: wants to see personal impact + stay engaged (drives the donation growth goal).

Secondary internal user (still a key design target):
- **Employee (staff)**: day-to-day case management + logging (view + assist).

Public users (non-auth):
- Can view the **Landing page**, **Public Impact dashboard**, **Privacy policy**, and see **Cookie consent**.

## Tech stack (locked)

- Frontend: **React + TypeScript (Vite)** → **Azure Static Web Apps**
- API: **ASP.NET Core (.NET 10)** → **Azure App Service**
- Database: **Azure SQL Database**
- Auth: **ASP.NET Identity + JWT**
- RBAC roles: `Admin`, `Employee` (and scaffolded `Donor` for later)

Repo structure:
- `api/Intex.Api/` — .NET 10 API
- `web/` — React/TS app
- `docs/` — deployment + future docs
- `data/raw/` — place the provided INTEX CSVs here (not committed)
- `ml-pipelines/` — reserved for IS455 notebooks (to be added)
- `output/ml-predictions/` — notebook-exported predictions JSON (optional to commit; safe if it contains no sensitive data)

## Personas (for IS401 + product decisions)

### Persona 1 — Donor (Monetary Supporter)

- **Name:** Hana Kim
- **Role:** Donor (authenticated; not staff)
- **Environment:** mobile-first; discovers updates via social media; wants quick clarity and trust
- **Goals:**
  - Understand how her donations translate into real outcomes (without exposing sensitive details).
  - Feel confident recurring giving is safe and used effectively.
  - Get timely, relevant updates that match her interests (education, health, reintegration).
- **Pain points:**
  - Generic donation receipts that don’t show impact.
  - Not sure which campaigns matter or when giving is most needed.
  - Doesn’t want to share personal data broadly.
- **Top tasks in the portal:**
  - View donation history (amounts, campaigns, dates).
  - View personalized impact summary (aggregated/anonymized).
  - Manage communication preferences (future).
- **Security needs:**
  - Only sees **her** donation history and approved impact aggregates.
  - No access to resident-level data or staff portal features.
- **Success looks like:**
  - Higher retention (keeps giving) and increased donation frequency/amount.

### Persona 2 — Admin (Leadership / Operations Director)

- **Name:** Mia Santos
- **Role:** Employee / Social work staff (non-admin)
- **Environment:** shared office computer + occasional mobile use; time-constrained; sensitive context
- **Goals:**
  - Quickly find a resident and understand current status.
  - Log process recordings and home visitation notes consistently.
  - Prepare for upcoming case conferences without missing follow-ups.
- **Pain points:**
  - Too many spreadsheets/documents → inconsistent formats.
  - Hard to spot who is “at risk” or slipping without a consolidated view.
  - Documentation takes time and is easy to delay.
- **Top tasks in the portal:**
  - Search/filter caseload inventory.
  - Review resident history chronologically (process recordings, home visits).
  - Review dashboards/reports to prioritize work.
- **Security needs:**
  - Must never expose resident identities publicly.
  - Should not be able to delete records.
  - Least-privilege: view-only for high-risk operations.
- **Success looks like:**
  - No “lost” cases; fewer missed follow-ups; faster documentation turnaround.

- **Name:** Jordan Lee
- **Role:** Admin / Operations Director
- **Environment:** laptop, often remote; needs reliable dashboards; accountability to donors and partners
- **Goals:**
  - Monitor safehouse load and resident progress at a glance.
  - Ensure documentation is happening (process recordings / home visits).
  - Understand donation trends and connect resources to outcomes.
  - Manage data quality and correct mistakes safely.
- **Pain points:**
  - Limited staff → needs “command center” visibility.
  - Reporting is slow; data isn’t consistently tied to decisions.
  - Security/privacy risk is existential (minors + abuse survivors).
- **Top tasks in the portal:**
  - View Admin Dashboard KPIs.
  - Create/update records (supporters, contributions, residents, visits, recordings, conferences).
  - Export/share anonymized impact snapshots publicly.
- **Security needs:**
  - Admin-only CUD enforced on both UI and API.
  - Audit-friendly behavior (confirm deletes, stable sorting, predictable views).
  - Secrets must never be in the public repo.
- **Success looks like:**
  - Clear metrics for leadership decisions; consistent reporting; safe operations.

### Secondary Persona — Employee (Case Management Staff)

- **Name:** Mia Santos
- **Role:** Employee / Social work staff (non-admin)
- **Environment:** shared office computer + occasional mobile use; time-constrained; sensitive context
- **Goals:**
  - Quickly find a resident and understand current status.
  - Log process recordings and home visitation notes consistently.
  - Prepare for upcoming case conferences without missing follow-ups.
- **Pain points:**
  - Too many spreadsheets/documents → inconsistent formats.
  - Hard to spot who is “at risk” or slipping without a consolidated view.
  - Documentation takes time and is easy to delay.
- **Top tasks in the portal:**
  - Search/filter caseload inventory.
  - Review resident history chronologically (process recordings, home visits).
  - Review dashboards/reports to prioritize work.
- **Security needs:**
  - Must never expose resident identities publicly.
  - Should not be able to delete records.
  - Least-privilege: view-only for high-risk operations.
- **Success looks like:**
  - No “lost” cases; fewer missed follow-ups; faster documentation turnaround.

## INTEX deliverables we must show (high-level)

IS401 (daily FigJam artifacts):
- Roles, personas, journey map, problem statement, MoSCoW, backlogs, burndown, wireframes, AI UI options, accessibility/retro, OKR metric.

IS413 (web app requirements):
- Public pages: Home, Impact (public dashboard), Login, Privacy Policy + Cookie consent.
- Auth portal pages: Admin dashboard, Donors & Contributions, Caseload Inventory, Process Recording, Home Visitation & Case Conferences, Reports & Analytics.
- Deployed app + deployed DB.

IS414 (security rubric):
- HTTPS + HTTP→HTTPS, auth, stronger password policy, auth on pages/endpoints, RBAC, delete confirmations, secrets handling, privacy policy, cookie consent, CSP header, deployed publicly, plus extra security features.

IS455 (ML):
- Notebooks in `ml-pipelines/` + model outputs integrated into the deployed app.

## Current implementation snapshot (what exists right now)

Frontend:
- Public: `/`, `/impact`, `/login`, `/privacy`
- Auth app: `/app/dashboard`, `/app/donors`, `/app/cases`, resident process recordings + home visits + conferences, `/app/reports`
- Cookie consent banner + theme toggle cookie (browser-accessible)
- CSP/HSTS/etc. set in `web/staticwebapp.config.json`

API:
- `POST /api/auth/login`, `GET /api/auth/me`
- Public impact snapshots: `GET /api/public/impact-snapshots`
- Auth-protected CRUD endpoints for supporters, contributions, residents, process recordings, home visitations, case conferences
- Delete confirmation enforced via `?confirm=true`
- Dashboard/report endpoints: `/api/admin-dashboard/*`, `/api/reports/*`

Note: builds/restores require internet access to NuGet/npm.

## Environment variables (do NOT commit secrets)

API (App Service “Configuration”):
- `ConnectionStrings__AppDb` (Azure SQL)
- `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`
- `Cors__AllowedOrigins__0` = SWA URL
- Optional seed users: `Seed__AdminEmail`, `Seed__AdminPassword`, `Seed__EmployeeEmail`, `Seed__EmployeePassword`

Web (SWA env vars):
- `VITE_API_BASE_URL` = App Service API URL

## Deployment

Step-by-step Azure setup: `docs/azure-deploy.md`

## “Show it in the video” reminders (grading reality)

- Demonstrate CSP in browser dev tools response headers (SWA).
- Show HTTPS and HTTP→HTTPS behavior.
- Show unauthenticated user can browse public pages but not `/app/*`.
- Show RBAC: employee can view but cannot CUD; admin can CUD.
- Show delete confirmation behavior (UI prompt + API confirm requirement).
- Be explicit whether cookie consent is cosmetic or functional (ours is functional for preference cookies).
- Show ML integration: run a notebook → export JSON → import via `POST /api/ml/import?replace=true` → view in `/app/ml`.

## How AI should help (allowed + encouraged)

Use AI for:
- UI iteration, accessibility fixes, boilerplate privacy policy customization.
- Security header/RBAC checklists and “video proof” scripts.
- ML notebook scaffolds and integration wiring.

Avoid:
- Copying security policy values that conflict with your class/lab instructions (password policy especially).
- Claiming features exist unless they’re deployed and shown on video.
