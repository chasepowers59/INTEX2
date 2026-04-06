# Azure Deployment (SWA + App Service + Azure SQL)

Region guidance (team decision):
- Since you’re operating in **South Korea**, prefer creating resources in **Korea Central** (or the closest available region you have access to) to reduce latency.

## 1) Azure SQL Database

1. Create **Azure SQL server + database**.
2. Set firewall:
   - Allow your client IP for local dev.
   - Allow Azure services if needed for App Service connectivity.
3. Copy the connection string and set it on the API as `ConnectionStrings__AppDb`.

## 2) API — Azure App Service

1. Create an **App Service** (Linux or Windows is fine) for the API.
2. Deploy `api/Intex.Api` (GitHub deploy or Zip deploy).
3. In **Configuration → Application settings**, set:
   - `ConnectionStrings__AppDb` = (Azure SQL connection string)
   - `Jwt__Key` = long random secret (32+ chars)
   - `Jwt__Issuer` = `intex-w26`
   - `Jwt__Audience` = `intex-w26-web`
   - `Cors__AllowedOrigins__0` = `https://<your-swa-name>.azurestaticapps.net`
   - Seed users (optional but recommended for first deploy):
     - `Seed__AdminEmail`, `Seed__AdminPassword`
     - `Seed__EmployeeEmail`, `Seed__EmployeePassword`
   - `Database__AutoMigrate` = `true` (set `false` later if you don’t want automatic migrations)
4. Verify:
   - `https://<your-api>.azurewebsites.net/health` returns `{ status: "ok" }`.
5. HTTPS/redirect:
   - App Service is HTTPS by default. Ensure “HTTPS Only” is enabled.

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
