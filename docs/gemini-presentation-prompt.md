# Gemini Presentation Prompt

Use the prompt below in Gemini to generate a polished presentation for this project:

```text
Create a polished 10-12 slide presentation for a university capstone project called "Steps of Hope."

Context:
- This project is based on the requirements in the INTEX W26 case.
- The main problem is building a secure, data-driven nonprofit platform for survivor support operations, donor transparency, and machine-learning-assisted decision support.
- The source operational dataset originated from Lighthouse Sanctuary sample data, but our product concept/brand is "Steps of Hope."
- Our team positioned the nonprofit around South Korean survivor support, while using the shared Lighthouse-style operational dataset to model workflows, reporting, and analytics.

What we built:
- Frontend: React + TypeScript + Vite
- Backend: ASP.NET Core (.NET 10) Web API
- Database: Azure SQL Database
- Hosting: Azure Static Web Apps for frontend, Azure App Service for API
- CI/CD: GitHub Actions pipelines for both frontend and API deployments
- Auth: ASP.NET Identity + JWT + RBAC
- Roles: Admin, Employee, Donor

Core product experience:
- Public pages:
  - Home / landing page
  - Impact dashboard
  - About
  - Programs / How We Help
  - Contact
  - Login
  - Donor registration
  - Privacy policy
  - Cookie consent
- Authenticated portal:
  - Admin dashboard
  - Donors & contributions
  - Caseload inventory
  - Process recordings
  - Home visitations & case conferences
  - Reports & analytics
  - ML insights
  - ML action center
  - Social media strategy
  - Admin user management
  - Admin allocations
  - Admin partners / assignments
  - Donor portal

Security and compliance features actually present in the app:
- HTTPS deployment
- HSTS in production
- CSP header configured in Static Web Apps config
- Authentication with username/password
- RBAC
- Admin-only create/update/delete on operational data
- Delete confirmation enforced in API with confirm=true
- Privacy policy page
- Functional cookie consent for preference cookies
- Browser-accessible theme cookie
- Secrets handled through environment/app settings

Machine learning work included:
- donor-lapse-risk.ipynb
- donor-upgrade-propensity.ipynb
- next-best-campaign.ipynb
- social-post-donation-referrals.ipynb
- safehouse-capacity-forecast.ipynb
- resident-risk-and-readiness.ipynb
- ML outputs are integrated into the app through staff-facing ML pages and analytics surfaces

Important presentation rules:
- Do not invent features we did not build.
- Be honest about gaps and frame them professionally.
- One important remaining compliance gap is MFA/2FA unless it has been separately configured in Azure outside the repo.
- Mention that the app was recently improved to:
  - enforce the stronger configured password policy correctly
  - clean generated Python cache files from the repo
  - prevent zero-value future snapshot data from degrading the public impact dashboard
  - align donor registration UX with the real password/security policy

What I want from you:
1. A slide-by-slide outline with titles and bullet content.
2. Speaker notes for each slide.
3. A strong opening hook and closing statement.
4. A 5-7 minute demo flow for the live presentation.
5. A visual direction for the slides that matches the site:
   - warm, credible, mission-driven
   - modern nonprofit feel
   - clean data visuals
   - no cheesy stock-pitch tone
6. Suggestions for what screenshots to capture from the app for each slide.
7. A short “questions we should be ready for” section at the end.

Please organize the deck around these themes:
- Problem and client context
- Users/personas
- Product solution
- Architecture and deployment
- Security/compliance
- Machine learning and business value
- Live demo plan
- Results, gaps, and next steps

Also include one slide that clearly explains the relationship between:
- Lighthouse Sanctuary sample data
- our Steps of Hope branding
- the South Korea operating concept
so judges do not get confused.
```
