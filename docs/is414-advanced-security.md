# IS414 Advanced Security Implementation Guide

This guide covers the remaining optional/high-value items and exactly where to implement them in this project.

## 1) Docker Deployment (implemented)

### Files added
- `api/Intex.Api/Dockerfile`
- `web/Dockerfile`
- `web/nginx.conf`
- `docker-compose.yml`

### Run locally
```bash
docker compose up --build
```

### Required edits before use
Update these `docker-compose.yml` values:
- `ConnectionStrings__AppDb`
- `Jwt__Key` (32+ chars)
- optional CORS origin(s)

## 2) Third-party auth (Google/Microsoft) — implementation path

This is **not** wired yet because it requires provider credentials and callback URLs.

### What to add (API)
In `api/Intex.Api/Program.cs`:
1. Add external auth package(s), for example:
   - `Microsoft.AspNetCore.Authentication.Google`
   - `Microsoft.AspNetCore.Authentication.MicrosoftAccount`
2. Register provider:
   - `.AddGoogle(...)` or `.AddMicrosoftAccount(...)`
3. Add callback endpoint in `AuthController` to:
   - complete external sign-in
   - create/link local `AppUser`
   - issue your JWT (`TokenService`)

### Config to provide
Use environment variables (not source):
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`
- or Microsoft equivalents

### Video proof
- Show provider login button
- Show successful callback/login
- Show account mapped to roles in app

## 3) MFA / 2FA — implementation path

This is **not** wired yet in UI flow.

### Suggested implementation (ASP.NET Identity TOTP)
Files:
- `api/Intex.Api/Controllers/AuthController.cs`
- `api/Intex.Api/Controllers/UserAdminController.cs` (or new MFA controller)
- `web/src/routes/pages` (new setup/verify pages)

Flow:
1. Authenticated user requests authenticator setup secret + QR URI.
2. User scans QR in Authenticator app.
3. User submits TOTP code to confirm.
4. Set `TwoFactorEnabled = true`.
5. On login, require second-step code if 2FA enabled.

### Grading caveat from requirement
Keep at least one admin and one non-admin account **without 2FA** for TA access.

## 4) Input sanitization/encoding callout (already mostly covered)

### Current status
- React rendering is safe by default (no `dangerouslySetInnerHTML` usage in `web/src`).
- API controllers are role-restricted for data modification.

### Recommended explicit demo callout
In video, state:
1. Frontend uses React default output encoding (no raw HTML injection rendering).
2. API applies validation and rejects bad input paths.
3. CSP header is active to reduce script-injection impact.

### Optional hardening (if you want extra)
Add server-side sanitization for free-text fields before save:
- `ProcessRecordingsController`
- `HomeVisitationsController`
- `ReportsController` snapshot text

## 5) Suggested “highest points per hour” order
1. Docker demo (already done)
2. Third-party auth (Google) single-provider
3. TOTP MFA for one account type
4. Clear security narration in final video (headers + role restrictions + cookie consent behavior)

