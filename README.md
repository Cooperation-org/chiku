# Chiku - Modern Taiga Frontend

A fast, Linear-inspired frontend for Taiga built with SvelteKit. Drop-in replacement for the default Taiga frontend.

Repo: https://github.com/Cooperation-org/ash

## Features

- Kanban board with drag-and-drop (PATCHes status/order with optimistic updates)
- Story detail view with comments, deep-linkable via `?story=<ref>`; shows who created the story
- Estimate a story from its card: pick from the project's points, or clear it. Taiga
  stores an estimate per role and sums them; the card keeps one number by putting the
  pick on the first counting role and blanking the others (`src/lib/api/points.ts`)
- Attachments on stories: drag-and-drop or click to upload, download, remove.
  Markdown attachments render inline, other text files show as plain text,
  images show inline. Files are stored by Taiga (`/userstories/attachments`),
  so anything that posts there — including amebo — shows up in the UI.
- Backlog list view
- Epics with progress tracking
- Velocity charts and sprint projections
- My Tasks view across projects
- Project-scoped URLs: `/p/<project-slug>/board`, `/backlog`, `/epics`, `/velocity`
- Sign in with LinkedTrust (team OIDC provider, brokers Google + Bluesky), plus optional direct Google OAuth, Bluesky, and Taiga password login
- Dark mode UI
- Works with any existing Taiga backend

## Authentication

The primary login is **Sign in with LinkedTrust**, run entirely server-side by
taiga-back (no frontend OAuth config): the button sends the browser to
`${VITE_API_URL}/auth/linkedtrust/redirect`, taiga-back 302s to the IdP
(live.linkedtrust.us), completes the code exchange with its confidential
client, and redirects back to `{origin}/oauth/callback` with tokens in the
URL fragment. The SPA stores them in localStorage and returns the user to the
page they originally requested (deep links like `/p/<slug>/board?story=<ref>`
survive the round trip).

There is no self-serve registration in the UI — accounts are provisioned via
SSO (or by a Taiga admin for password accounts).

## Deployment

Marten builds to a fully static SPA (`@sveltejs/adapter-static` with an
`index.html` fallback), so any static file server with SPA fallback works.

### Cohort VM (marten.workers.vc)

The deployment at `https://marten.workers.vc` deploys automatically: every
push to `main` triggers `.github/workflows/deploy-to-cohort.yml`, which SSHes
to the cohort VM and runs `/opt/earnkit/bin/update-marten` (pull, build,
publish). No manual steps.

### Any Taiga server

```bash
git clone git@github.com:Cooperation-org/marten.git
cd marten
npm install
# Point the build at your Taiga API if it is not proxied at /api/v1:
# echo 'VITE_API_URL=https://taiga.example.com/api/v1' > .env
npm run build
```

Serve `build/` at the site root with an SPA fallback, e.g. nginx:

```nginx
location / {
    root /path/to/marten/build;
    try_files $uri $uri/ /index.html;
}

# Keep the API proxy as-is:
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    # ... existing proxy settings
}
```

The app must be served at the origin root (routes like `/p/<slug>/board` are
absolute); it is not designed to run under a path prefix.

## Development

```bash
# Install dependencies
npm install

# Run dev server (proxies /api to localhost:8000)
npm run dev

# Type-check
npm run check

# Unit tests (vitest)
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Authentication Details

The backend plugin that handles LinkedTrust OIDC is
[`django-linkedtrust-auth`](https://github.com/Cooperation-org/django-linkedtrust-auth)
— a standalone Django package installed into taiga-back via pip. It handles the
full server-side OIDC flow (redirect to IdP, code exchange, user creation,
invite verification) so the frontend only needs to link to the backend's
`/redirect` endpoint and read tokens from the `/oauth/callback` fragment.

See the plugin's own README for backend setup, invite links, and adapting it to
non-Taiga Django apps.

### Frontend source files

| File | What it does |
|------|-------------|
| `src/routes/login/+page.svelte` | Login page — renders sign-in buttons |
| `src/lib/components/auth/DesktopLogin.svelte` | Desktop login UI (LinkedTrust + Google buttons) |
| `src/lib/components/auth/MobileLogin.svelte` | Mobile login UI (same buttons) |
| `src/routes/oauth/callback/+page.svelte` | Handles the IdP redirect — reads tokens from URL fragment |
| `src/lib/stores/auth.ts` | Auth state store (token storage, login/logout) |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Taiga API URL | `/api/v1` (uses nginx proxy) |
| `PUBLIC_GOOGLE_CLIENT_ID` | Optional: enables the direct "Continue with Google" button | unset (button hidden) |

Sign in with LinkedTrust needs no frontend variables — the OIDC client
lives in taiga-back. See `.env.example`.

## Tech Stack

- SvelteKit (static adapter, SPA)
- Tailwind CSS
- TypeScript
- Vite + Vitest
