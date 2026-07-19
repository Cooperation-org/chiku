# Marten - Development Notes

## What's Done

### Core Features
- **Login** - "Sign in with LinkedTrust" is the primary flow: server-side OIDC
  run by taiga-back (`${API}/auth/linkedtrust/redirect` → IdP →
  `/oauth/callback` fragment tokens). Also direct Google OAuth (optional,
  `PUBLIC_GOOGLE_CLIENT_ID`), Bluesky (ATProto), and Taiga password login.
  Tokens live in localStorage. Deep links survive the login round trip
  (`src/lib/auth/returnTo.ts`). No self-serve registration — accounts come
  from SSO.
- **Project URLs** - `/p/<project-slug>/board|backlog|epics|velocity`
  (symlinked routes under `src/routes/p/[slug]/`); the layout resolves the
  slug against the freshly loaded project list. Project selector sidebar with
  create/edit/archive/delete/reorder.
- **Board View** - Kanban columns by status; drag-drop PATCHes
  status/order to the API with optimistic updates (`Board.svelte`).
  Column editor. `?story=<ref>` opens a story by its human ref.
- **Story detail** - Full-screen `IssueModal` with description, status,
  assignee, comments; URL-addressable via `?story=<ref>`.
- **Create story/epic** - `CreateStoryModal` / `CreateEpicModal`, wired.
- **Backlog View** - Table list of all stories, sortable, shows
  status/assignee/points
- **Epics View** - Card grid with progress bars, story counts
- **Velocity View** - Sprint velocity chart, current sprint progress,
  completion projections
- **My Tasks** - `/tasks`, stories assigned to the signed-in user across
  projects

### Infrastructure
- SvelteKit with TypeScript, static adapter (SPA with `index.html` fallback)
- Tailwind CSS (dark mode, custom LinkedTrust brand colors)
- Vite dev server with API proxy to localhost:8000
- Vitest unit tests (`npm test`), svelte-check (`npm run check`)
- Deploy: push to `main` → `.github/workflows/deploy-to-cohort.yml` →
  `/opt/earnkit/bin/update-marten` on the cohort VM → https://martin.workers.vc

### API Integration
- `src/lib/api/client.ts` - Fetch wrapper with auth token handling
- `src/lib/api/projects.ts` - Project list/detail/CRUD
- `src/lib/api/userstories.ts` - Stories + statuses
- `src/lib/api/epics.ts` - Epics CRUD
- `src/lib/api/milestones.ts` - Sprints for velocity
- `src/lib/api/memberships.ts` - Project members
- `src/lib/api/comments.ts` - Story comments

### State Management
- `src/lib/stores/auth.ts` - Login state, token, user info
- `src/lib/stores/project.ts` - Current selected project (persists id to
  localStorage)
- `src/lib/auth/returnTo.ts` - Deep-link preservation across login

---

## What's NOT Done

### High Priority
- [ ] **TanStack Query** - installed but unused; no caching layer yet
- [ ] **Error handling** - Basic, needs better UX for API failures
- [ ] **Loading states** - Just text, needs spinners/skeletons

### Medium Priority
- [ ] **Inline editing** - Edit title/points directly in backlog
- [ ] **Filters** - Filter by assignee, epic, tags, status
- [ ] **Search** - Find stories across project
- [ ] **Command palette** - ⌘K is advertised on the landing page but not
  implemented (tinykeys installed but not wired)

### Lower Priority
- [ ] **Attachments** - Story attachments not supported
- [ ] **Wiki** - Project wiki pages
- [ ] **Activity feed** - Recent changes timeline
- [ ] **User settings** - Profile, notifications
- [ ] **Bulk actions** - Select multiple stories, bulk update

---

## Architecture

```
src/
├── lib/
│   ├── api/               # Fetch wrapper + Taiga REST modules (see above)
│   ├── auth/
│   │   └── returnTo.ts    # Deep-link preservation across login
│   ├── stores/
│   │   ├── auth.ts        # Svelte store: user, token, login/logout
│   │   └── project.ts     # Svelte store: currentProject
│   └── components/
│       ├── auth/          # DesktopLogin, MobileLogin, BlueskyLogin
│       ├── board/         # Board, Column, Card (drag-drop + PATCH)
│       └── *.svelte       # IssueModal, Create*Modal, ColumnEditor, …
│
├── routes/
│   ├── +layout.svelte     # Sidebar, project list, auth guard, slug→project
│   ├── login/             # Login page (SSO buttons + password form)
│   ├── oauth/callback/    # LinkedTrust OIDC return (fragment tokens)
│   ├── auth/…/callback/   # Google and ATProto returns
│   ├── p/[slug]/          # Project-scoped views (symlinks to the flat routes)
│   ├── board|backlog|epics|velocity/
│   └── tasks/             # My Tasks
│
└── app.css                # Tailwind imports + custom component classes
```

### Data Flow

```
Visit any URL
    ↓
auth guard: not signed in → save path (returnTo) → /login
    ↓
LinkedTrust OIDC round trip (server-side in taiga-back) → /oauth/callback
    ↓
tokens stored → return to saved deep link (e.g. /p/<slug>/board?story=42)
    ↓
Layout loads projects fresh from API → resolves <slug> → currentProject
    ↓
Each view subscribes to currentProject → calls API → renders
```

---

## File Locations

| What | Where |
|------|-------|
| Taiga API types | `src/lib/api/types.ts` |
| Auth logic | `src/lib/stores/auth.ts` |
| Deep-link return | `src/lib/auth/returnTo.ts` |
| API base URL | `src/lib/api/client.ts` (`VITE_API_URL`, default `/api/v1`) |
| Tailwind colors | `tailwind.config.js` |
| Deploy workflow | `.github/workflows/deploy-to-cohort.yml` |
| Deploy docs | `README.md` |

---

## Quick Commands

```bash
npm run dev          # Dev server at :5173 (API proxy to :8000)
npm run check        # svelte-check
npm test             # vitest
npm run build        # Production build to build/
npm run preview      # Preview production build
```

Deploy to martin.workers.vc: just push to `main` (GitHub Actions runs
`/opt/earnkit/bin/update-marten` on the cohort VM).

---

## Taiga API Reference

| Endpoint | Used For |
|----------|----------|
| POST /auth | Login, returns auth_token |
| GET /auth/linkedtrust/redirect | Server-side LinkedTrust OIDC (302 to IdP) |
| GET /projects | List user's projects |
| GET /userstories?project=N | Stories for project |
| GET /userstory-statuses?project=N | Status columns |
| PATCH /userstories/N | Update story (status, points, etc) |
| GET /epics?project=N | Epics for project |
| GET /milestones?project=N | Sprints for velocity |
| GET /memberships?project=N | Project members |

Full API docs: https://docs.taiga.io/api.html
