# Cohort Dash — cross-repo plan (marten copy)

2026-07-19. One of six coordinated plan files, one per repo:
`workers.vc`, `govkit`, `amebo`, `marten`, `crm-outreach-runner`, `earnkit` —
each named `PLAN-cohort-dash.md` at the repo root. The **Architecture**
section is identical in all six; the **This repo** section is per-repo.
Work in parallel; commit and push regularly; each repo only implements its
own section and consumes the others' contracts as written here.

## Architecture (shared across all six repos)

**Goal.** Land accelerator teams on a real dashboard: the v3 design
(demos.linkedtrust.us/workersvc-design/dashboard.html) grown out of the
existing `/dash/` page, plus a mentor view, so invites can go out now.

**Principle** (amebo docs/DASHBOARD.md): the dash is an orientation
surface, not a workspace. Every fact lives in the tool that owns it; the
dash renders read-only cards and every card expands into the owning app
(Marten, GovKit, CRM, amebo). No fact is copied into the dash's DB.

**Mechanism: web components, one bundle per owning app.** Following the
existing amebo embed pattern (`amebo/embed/amebo.js`): each app ships a
vanilla-JS custom-elements bundle as a static file from its own origin.
The dash page includes the scripts and mounts the tags. No build step, no
framework, no shared library.

**Auth: SSO + same-site cookies + CORS allowlist.** Everything runs under
`*.workers.vc`, and every app logs in via LinkedTrust OIDC
(live.linkedtrust.us). Because all hosts share the registrable domain
`workers.vc`, each app's `SameSite=Lax` session cookie IS sent on a
credentialed fetch from the dash page — the only missing layer is CORS
response headers. So each app: (1) allowlists `https://workers.vc` (and
`https://www.workers.vc`) for CORS **with credentials**, scoped to its
JSON API paths; (2) authenticates component fetches with its normal
session cookie (`credentials: 'include'`). A component whose upstream
returns 401/403 renders nothing (the existing dash behavior) — signed-out
or non-member visitors just see fewer cards. Never render placeholder or
demo data.

**Org scoping.** The dash is per-team: `workers.vc/dash/<org-slug>/`.
The org slug is the shared tenant key across GovKit (`Org.slug`), amebo
(`organizations.slug` / instance orgs), Taiga (project slug), and Odoo
(DB `crm-<slug>_vc`, host `crm-<slug>.workers.vc`) — provisioned together by
`earnkit/playbooks/add-team.yml`. Components take the org via a
`data-org` attribute where the owning app needs it (GovKit), or resolve
it server-side from the authenticated identity (amebo — org is never a
component attribute there).

**Card → owner map** (v3 design → who ships the component):

| Card | Owner | Component | Expand target |
|---|---|---|---|
| The pie | GovKit | `<govkit-pie>` | `dash.workers.vc/o/<org>/pie/` |
| Earned on tasks (hours feed) | GovKit | `<govkit-feed>` | `dash.workers.vc/o/<org>/pie/` |
| Curriculum tracker | GovKit (genesis checklist) | `<govkit-checklist>` | `dash.workers.vc/o/<org>/` |
| Tasks to do | GovKit (tasksources → Taiga) | `<govkit-tasks>` | `martin.workers.vc/p/<org>/board` |
| Money | GovKit (projects app) | `<govkit-money>` | `dash.workers.vc/o/<org>/projects/` |
| Reach out (CRM) | crm-outreach-runner (Odoo) | `<crm-reachout>` | `crm-<org>.workers.vc` Outreach Runner |
| Ask amebo | amebo (exists) | `<amebo-ask>` | `amebo.workers.vc` |
| Campaigns / GTM board | amebo (`/api/organizations/board`) | `<amebo-board>` (phase 2) | org context repo / CRM / Taiga links |
| Whiteboard | amebo (phase 2) | — | amebo whiteboard |
| Tools row, faces, launch card | workers.vc server-side | — | — |

**Mentors.** No new role system. A mentor is a person with GovKit
`Membership` rows in multiple orgs (the accelerator org plus team orgs).
`GET dash.workers.vc/api/v1/accounts/me/` already returns
`memberships[{org_slug, org_name, role}]` — the dash uses it (via the
same CORS/session mechanism) to render an org switcher and a mentor
overview listing every org the viewer belongs to. Mentor booking info
(calendar_url/time_level) already lives in workers.vc's ledger.

**Deploys.** Push to main deploys workers.vc / govkit / amebo / marten
via GitHub Actions → `/opt/earnkit/bin/update-*` (service restart). Odoo
addons and nginx/env changes deploy by ansible run (see earnkit plan).

**Sequencing.** GovKit's CORS + bundle is the critical path (4 of the 8
cards); everything else proceeds in parallel against these contracts, and
each card goes live the moment its owner ships.

---

## This repo: marten — be the expand target; make landing smooth

Marten ships **no dash card in v1**. The tasks card is served by GovKit
(which already holds each org's Taiga API token) so the dash needs no
Taiga browser auth. Marten's job is to be where a team member lands when
they click a task — signed in via LinkedTrust, on their team's board,
with nothing broken on the way.

### Current state (verified 2026-07-19)

- SvelteKit static SPA over Taiga REST; Bearer JWT in localStorage;
  LinkedTrust server-side OIDC is the primary login
  (`${API}/auth/linkedtrust/redirect` → `/oauth/callback` fragment
  tokens). Board/backlog/epics/velocity/My-Tasks all functional; board
  drag-drop PATCHes with optimistic update.
- Deep links that the dash will use (client-side routed, SPA fallback):
  - `/p/<slug>/board` — team board (Taiga project slug = team org slug,
    provisioned by add-team.yml).
  - `/p/<slug>/board?story=<ref>` — opens a story by its human ref.
- Known breakage / cruft (from code, 2026-07-19):
  - "Create Account" tab calls `auth.register(...)` but the auth store
    defines no `register` — the tab throws
    (`DesktopLogin.svelte:102`, `MobileLogin.svelte:101`).
  - `src/lib/auth/linkedtrust.ts` (old client-side OIDC flow) is dead
    code but still imported by both login components.
  - `NOTES.md`/`README.md` are stale in places (claim drag-drop doesn't
    PATCH; old `/martin/` nginx alias instructions).
  - `⌘K` palette advertised on the landing but unimplemented.
- Taiga API CORS is wide open (`Access-Control-Allow-Origin: *`,
  header-based Bearer auth) — no CORS work needed on this side.

### Work items (in order)

1. **DONE (2026-07-19)** **Login lands teams**: auth guard now saves the
   original path incl. `?story=` (`src/lib/auth/returnTo.ts`,
   sessionStorage, sanitized against open redirects and login loops)
   before bouncing to `/login`; every login success path — OIDC
   `/oauth/callback`, Google, Bluesky, password — returns to it.
   Vitest coverage in `src/lib/auth/__tests__/returnTo.test.ts`.
2. **DONE (2026-07-19)** Register tab removed from DesktopLogin and
   MobileLogin (no `auth.register` anywhere, no `/register` route —
   nothing in the repo intends registration to work; cohort members
   arrive via SSO). Password Sign In form stays.
3. **DONE (2026-07-19)** `src/lib/auth/linkedtrust.ts` deleted with its
   imports, unused `linkedtrustUrl`/`linkedtrustClientId` props, and the
   `PUBLIC_LINKEDTRUST_*` env vars (`.env.example` updated — server-side
   flow needs no frontend config).
4. **VERIFIED (2026-07-19)** `/p/<slug>/…` is safe on first visit: the
   project list is fetched fresh from the API on every full page load
   (in-memory only; nothing cached across loads except the selected
   project *id*, which is only a fallback when the URL has no slug), and
   slug resolution is a reactive that waits for the loaded list — so a
   just-added project resolves on the first landing after login. No fix
   needed.
5. **DONE (2026-07-19)** NOTES.md/README.md rewritten: server-side OIDC
   flow, earnkit auto-deploy via `.github/workflows/deploy-to-cohort.yml`
   to `martin.workers.vc`, root-serving SPA nginx example replacing the
   stale `/martin/` alias instructions, and the false "drag-drop doesn't
   PATCH" / "create story/epic don't work" / "no story detail" claims
   corrected (all are implemented).
6. **Phase 2 (not now)**: a `<marten-board>` mini card via Svelte custom
   elements if we ever want live task rows rendered by marten itself on
   the dash; v1 deliberately routes that through GovKit.

### Definition of done

From `workers.vc/dash/<team>/`, clicking a task row opens
`martin.workers.vc/p/<team>/board?story=<ref>`; a signed-out member goes
through LinkedTrust and arrives at that same story; no login-page button
throws; docs match the deployment.
