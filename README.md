# INTEX W26 — Lighthouse Sanctuary (Team Project)

Stack (per case requirements):
- Frontend: React + TypeScript (Vite) deployed to Azure Static Web Apps
- API: ASP.NET Core (.NET 10) deployed to Azure App Service
- Database: Azure SQL Database

This repo contains:
- `api/Intex.Api` — backend API + auth/RBAC
- `web/` — React/TS frontend (SPA)
- `ml-pipelines/` — (to be added) Jupyter notebooks for IS455

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

## Deployment notes (Azure)

High-level:
1. Create Azure SQL Database + set firewall rules.
2. Deploy API to Azure App Service and configure App Settings (env vars).
3. Deploy `web/` to Azure Static Web Apps and set `VITE_API_BASE_URL` to your App Service URL.

Step-by-step: `docs/azure-deploy.md`

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
