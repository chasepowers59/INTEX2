# Azure Setup: Third-Party Auth and MFA

This guide shows where and how to implement external sign-in and MFA for this project on Azure.

## 1) Choose auth strategy first

Use one of these paths:

- **Recommended for Azure-first:** Microsoft Entra ID (single provider)
- **Optional add-on:** Google OAuth (second provider)

Start with one provider, then add the second after sign-in flow is stable.

## 2) Third-party auth (where to implement)

### Azure portal tasks

1. Create app registration(s):
   - Microsoft Entra ID app (for Microsoft login)
   - Google OAuth client (if enabling Google)
2. Set callback URIs:
   - API callback endpoint, for example:
     - `https://<your-api-host>/api/auth/external/callback`
3. Save client ID/secret values in Azure App Service Configuration (not in code).

### API files to edit

- `api/Intex.Api/Program.cs`
- `api/Intex.Api/Controllers/AuthController.cs`
- `api/Intex.Api/Dtos/AuthDtos.cs` (if adding request/response models)

### Web files to edit

- `web/src/routes/pages/LoginPage.tsx`
- `web/src/lib/auth.ts`

### Environment variables (App Service)

- `Authentication__Microsoft__ClientId`
- `Authentication__Microsoft__ClientSecret`
- `Authentication__Google__ClientId` (if enabled)
- `Authentication__Google__ClientSecret` (if enabled)

### Minimal backend flow

1. Login page calls API endpoint to start provider challenge.
2. Provider redirects to API callback URI.
3. API callback creates/links local Identity user.
4. API issues your existing JWT.
5. Frontend stores token and routes by role.

## 3) MFA / 2FA (where to implement)

### Policy decision required first

Pick one:

- Admin required, staff optional, donor optional
- Admin + employee required, donor optional
- All roles required (not recommended for demo simplicity)

### API files to edit

- `api/Intex.Api/Controllers/AuthController.cs` (or new `MfaController`)

Add endpoints for:
- Start setup (generate authenticator key + otpauth URI)
- Verify first code (enable 2FA)
- Disable 2FA (with re-auth or admin policy)
- Login verify step for users with `TwoFactorEnabled = true`

### Web files to edit

- `web/src/routes/pages/LoginPage.tsx` (second-step code screen)
- New pages, e.g.:
  - `web/src/routes/pages/app/security/MfaSetupPage.tsx`
  - `web/src/routes/pages/app/security/MfaVerifyPage.tsx`

### Data model

ASP.NET Identity already supports:
- `TwoFactorEnabled`
- authenticator key storage
- recovery codes

No DB schema change is usually required if standard Identity fields are already present.

## 4) Azure deployment checklist

1. Add client secrets and JWT secrets in App Service Configuration.
2. Confirm API and web URLs are in provider allowed redirect/origin lists.
3. Redeploy API + web.
4. Smoke test:
   - External login success
   - First-time user link/create
   - Role routing still correct
   - MFA setup + verify + login challenge pass

## 5) Recommended rollout order

1. Microsoft Entra sign-in only
2. MFA for Admin role
3. MFA for Employee role
4. Optional Google sign-in

