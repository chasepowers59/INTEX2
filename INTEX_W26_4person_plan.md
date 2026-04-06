# INTEX W26 — 4-Person Step-by-Step Plan (This Week)

Dates in the case packet:
- **Mon–Thu:** daily IS401 deliverables due **11:59pm** each night
- **Fri Apr 10 @ 10:00am:** final submission (website + repo + videos + notebooks + creds)
- **Fri Apr 10 @ 11:59pm:** peer evaluation due

Assumptions (adjust if your instructor says otherwise):
- You are starting work **Mon Apr 6**.
- Your team will use **.NET 10 + React/TS (Vite)** with a deployed relational DB (Azure recommended in the packet).
- You will download the CSV dataset from the Google Drive link in the packet and place it in your repo (e.g., `data/raw/*.csv`).

---

## Member 1 — Product Owner + IS401 Lead (Owns: FigJam, backlog, narrative)

### Monday (Requirements — due Mon @ 11:59pm)
1. **Pick roles**: assign Scrum Master + Product Owner (you can hold one of these).
2. **Name the org**: propose 3–5 names, pick 1, write 2–3 sentence rationale.
3. **Personas (2)**: define the two most important users (likely *staff/admin* + *donor*).
4. **Journey map**: current flow + pain points for both personas.
5. **Problem statement**: 1 paragraph, specific + measurable outcomes.
6. **MoSCoW table**: list *every* INTEX requirement; add ≥5 nice-to-haves; explicitly note 1 feature you chose **not** to build and why.
7. **Product backlog**: product goal + ≥12 backlog cards (clear “done” criteria).
8. **Sprint “Monday” backlog**: sprint goal + ≥8 cards, point estimate, exactly 1 assignee each; **screenshot before coding**.
9. **Burndown**: create it and ensure backlog points roll up correctly.
10. **Figma wireframes (3 screens)**: desktop wireframes for the 3 most important screens (coordinate with Member 2).
11. **Submit FigJam link** to IS401 Learning Suite.

### Tuesday (Design — due Tue @ 11:59pm)
1. **Sprint “Tuesday” backlog**: goal + ≥8 cards, points, 1 assignee each; screenshot.
2. **AI UI options package**: 3 UI concepts × 3 screenshots each (9 total) + 5 AI questions per concept + 1–2 sentence takeaways.
3. **Design decision**: choose 1 concept, justify in a short paragraph, list 3 changes made from AI output.
4. **Tech stack diagram**: logos for frontend, backend, DB.

### Wednesday (One working page — due Wed @ 11:59pm)
1. **Sprint “Wednesday” backlog**: goal + ≥8 cards; screenshot.
2. **Current state screenshots**: ≥5 pages, desktop + mobile.
3. **User feedback**: show to a real person; capture 5 specific changes to make.
4. **Burndown update**: reflect actual progress.

### Thursday (Iterate — due Thu @ 11:59pm)
1. **Sprint “Thursday” backlog**: goal + ≥8 cards; screenshot.
2. **OKR metric**: define 1 “north star” metric + why it matters; ensure it’s displayed in the app.
3. **Accessibility**: Lighthouse accessibility ≥90% on every page (coordinate with Member 2).
4. **Responsiveness**: every page works desktop + mobile (coordinate with Member 2).
5. **Retrospective**: each person writes 2 going well, 2 could improve, greatest contribution; then team reflection paragraph.

### Friday (Submission + presentation)
1. **Qualtrics final submission**: group info + URLs (website, GitHub branch, notebooks, videos).
2. **Ensure GitHub repo is Public** before submitting.
3. **Presentation narrative**: 5–7 minute story + demo flow + “what we didn’t build” honesty.
4. **Peer evaluation**: complete after presentation (due Fri @ 11:59pm).

Key handoffs you own:
- Final “scope call” (what is/isn’t built) so Members 2–4 don’t build the wrong thing.
- Video outline for IS413/IS414/IS455 so every rubric item is shown on-camera.

---

## Member 2 — UX + Frontend Lead (Owns: React UI, accessibility, responsiveness)

### Monday
1. Partner with Member 1 on **3 key screens** for wireframes (recommended):
   - Public landing + impact dashboard (public)
   - Login
   - Admin dashboard / caseload inventory (pick based on what you’ll implement first)
2. Define UI component plan: layout, navigation, tables, forms, charts.

### Tuesday
1. Produce the **9 AI UI screenshots** and document the **AI Q&A** (Member 1 needs these in FigJam).
2. Implement the chosen UI direction in React:
   - App shell (nav, route guards placeholders)
   - Mobile/desktop responsive layout primitives
   - Chart library decision (keep simple)
3. Create pages (even as placeholders) to hit the “≥5 pages” requirement by Wednesday:
   - Home
   - Impact dashboard (public)
   - Login
   - Admin dashboard
   - Donors & contributions OR Caseload inventory

### Wednesday (One working page end-to-end)
1. Coordinate with Member 3 to choose the **one page** that will:
   - be deployed,
   - call the backend,
   - and persist to the DB.
2. Finish that page UI + validation + error handling (must be demo-ready).
3. Capture desktop/mobile screenshots of ≥5 pages.

### Thursday
1. **Accessibility ≥90%** per page:
   - semantic HTML, labels, focus states, contrast, ARIA where needed
2. **Responsiveness**:
   - tables (horizontal scroll or card layout), forms, charts, nav collapse
3. Implement the **OKR metric** display with Member 3 (data source + UI).
4. Cookie consent UI (coordinate with Member 4 if they implement the policy mechanics).

### Friday
1. Help record the **IS413 video**: show public pages, login, admin/staff portal flows, DB persistence.

Key dependencies:
- Needs API contracts from Member 3.
- Needs auth/RBAC behavior from Member 4 to correctly hide/show actions.

---

## Member 3 — Backend + Data Lead (Owns: schema, ETL/import, CRUD APIs, deployment)

### Monday
1. Download dataset CSVs into repo (recommended structure): `data/raw/*.csv`.
2. Propose initial **relational schema** aligned to required app pages:
   - supporters/donations + allocations
   - residents/cases + process recordings + home visitations + conferences
   - social media posts + public impact snapshots
3. Decide “MVP data path” for Wednesday’s one working page:
   - pick 1 table to create/update from the UI (CUD) and 1–2 lookups (R).

### Tuesday
1. Scaffold .NET API:
   - DB context + migrations
   - DTOs + validation
   - baseline endpoints for the Wednesday page
2. Seed/import:
   - build a repeatable CSV import (command/script) into the deployed DB
3. Stand up deployment target for **API + DB** (Azure recommended in packet).

### Wednesday
1. Ensure the chosen “one working page” supports:
   - create/update,
   - persistence,
   - read-back verification (refresh shows saved data)
2. Confirm deployed URL is stable for videos.

### Thursday
1. Implement analytics endpoints powering:
   - admin dashboard metrics
   - reports/analytics trends
   - OKR metric
2. Performance + reliability:
   - pagination for list endpoints
   - consistent sorting
   - friendly errors

### Friday
1. Provide final URLs and a quick “how to run locally” in the repo README.

Key dependencies:
- Auth/RBAC middleware from Member 4 may block endpoints; coordinate early.
- Frontend needs stable endpoint contracts; document them (Swagger/OpenAPI if possible).

---

## Member 4 — Security + ML Lead (Owns: IS414 rubric + IS455 pipelines + integration)

### Monday
1. Create security checklist mapped to rubric items so the **video** can prove each one.
2. Decide identity strategy:
   - ASP.NET Identity (recommended) + roles: `admin`, `donor`, optional `staff`
3. Identify 1–2 ML pipeline ideas aligned to the case goals (examples):
   - donor lapse/churn risk classification
   - predicted donation propensity / next-best-campaign
   - reintegration readiness risk scoring
   - resident regression risk classification
   - social post → donation referral prediction

### Tuesday
1. Implement core IS414 items:
   - HTTPS + HTTP→HTTPS redirect (via hosting + app config)
   - username/password auth
   - stronger password policy (per your lab instructions)
   - auth on pages + API endpoints
   - RBAC: only admin can CUD
   - delete confirmation UI requirement (coordinate w/ Member 2) + backend enforcement
   - secrets handling: `.env`/KeyVault/etc. (no secrets in public repo)
   - privacy policy page content + footer link
   - cookie consent mechanism (cosmetic vs functional — be explicit in video)
   - CSP HTTP header configured
2. Pick **additional security features** (target 2–3 so you can explain them):
   - 3rd-party auth (e.g., Google)
   - MFA/2FA (ensure you also have required non-MFA test accounts for graders)
   - HSTS
   - input sanitization/output encoding
   - deploy identity DB to real DBMS (not SQLite)
   - Docker deployment

### Wednesday
1. Make sure auth/RBAC doesn’t block the “one working page” demo.
2. Create required test accounts (for final submission):
   - admin (no MFA)
   - donor (no MFA) + connected to historical donations
   - any account (admin or donor) with MFA enabled (graders won’t log in, they’ll just test enforcement)

### Thursday
1. Build ML pipelines and commit notebooks to `ml-pipelines/`:
   - each notebook includes the required sections (problem framing → deployment notes)
2. Integrate model output into the deployed app:
   - API endpoint returning predictions OR precomputed scores
   - UI component showing “what to do next” (not just a metric)
3. Prep the IS414 + IS455 videos checklists (exact rubric items shown).

### Friday
1. Help record:
   - IS414 video (prove each rubric item in browser dev tools where needed, especially CSP header)
   - IS455 video (show notebooks + deployed integration)
2. Provide the credential list for the Qualtrics form.

Key dependencies:
- Needs working deployed environment from Member 3 for HTTPS/HSTS and for “integration”.
- Needs dataset present to build real pipelines and connect donor history to donor users.

---

## What I (AI) Can Build vs What You Must Do

I can build in this repo (once you confirm your tech choices and place the CSVs locally):
- Draft IS401 text artifacts: personas, journey map bullets, problem statement, MoSCoW, backlog card wording, OKR metric definition, retro prompts.
- Create code scaffolding: .NET API + React/Vite app skeleton, routing, basic UI components, sample pages, accessibility fixes.
- Design database schema + migrations + repeatable CSV import scripts.
- Implement security items: auth/RBAC, stronger password policy (if you tell me your lab’s required settings), CSP header, privacy policy page copy, cookie consent component, HSTS, 3rd-party auth, MFA/2FA.
- Scaffold ML notebooks in `ml-pipelines/` with the required section headings and starter code for at least 1–2 pipelines, plus endpoints/UI to display model outputs.
- Create video checklists/scripts so your recordings hit every rubric item.

You must do yourselves (I can’t directly complete these without your accounts/screens/real-world steps):
- Download the dataset from the Google Drive link and place the CSVs into this workspace.
- Create/copy the FigJam board, upload screenshots there, and submit the FigJam link in Learning Suite.
- Create cloud resources/credentials (Azure, DB, hosting) and enter secrets in the environment/secrets manager.
- Record and publish the required videos (IS413, IS414, IS455) and submit URLs in Qualtrics.
- Conduct “real person” user feedback and write the 5 planned changes from their feedback.
- Present live and complete the peer evaluation form.
