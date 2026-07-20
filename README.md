# Marten - Modern Taiga Frontend

A fast, Linear-inspired frontend for Taiga built with SvelteKit. Drop-in replacement for the default Taiga frontend.

Repo: https://github.com/Cooperation-org/marten

## Features

- Kanban board with drag-and-drop (PATCHes status/order with optimistic updates)
- Story detail view with comments, deep-linkable via `?story=<ref>`
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

## Authentication (LinkedTrust OAuth)

Marten uses **LinkedTrust** as its OIDC identity provider. LinkedTrust brokers
Google, Bluesky (ATProto), and LinkedTrust accounts, so a single "Sign in with
LinkedTrust" button covers all three.

### How it works

There are three pieces involved:

1. **Frontend** (this repo) — redirects the user to the IdP and handles the callback
2. **Backend plugin** (`taiga-back`: `taiga/auth/linkedtrust.py`) — exchanges the
   authorization code for tokens and creates/finds the Taiga user
3. **LinkedTrust IdP** (e.g. `live.linkedtrust.us`) — the OIDC server

The flow:

1. User clicks "Sign in with LinkedTrust" on the login page
2. Frontend builds an OIDC authorize URL and redirects to
   `{LINKEDTRUST_URL}/oauth/authorize` with `client_id`, `redirect_uri`, a CSRF
   `state`, and scopes `openid email profile trust`
3. User authenticates at the IdP (Google, Bluesky, or LinkedTrust credentials)
4. IdP redirects back to `{origin}/oauth/callback` with tokens in the URL fragment
5. The callback page (`src/routes/oauth/callback/+page.svelte`) extracts the
   `auth_token` and `refresh` token, stores them, and navigates to `/`

### Key source files

| File | What it does |
|------|-------------|
| `src/lib/auth/linkedtrust.ts` | Builds the authorize URL, manages CSRF state |
| `src/routes/oauth/callback/+page.svelte` | Handles the IdP redirect, extracts tokens |
| `src/routes/login/+page.svelte` | Login page that renders the sign-in buttons |
| `src/lib/components/auth/DesktopLogin.svelte` | Desktop login UI with LinkedTrust + Google buttons |
| `src/lib/components/auth/MobileLogin.svelte` | Mobile login UI (same buttons) |
| `src/lib/stores/auth.ts` | Auth state store (token storage, login/logout) |

On the backend side (in taiga-back):

| File | What it does |
|------|-------------|
| `taiga/auth/linkedtrust.py` | The auth plugin — code exchange, userinfo fetch, user creation |
| `taiga/auth/token_denylist/apps.py` | Loads the plugin at startup via `register()` |
| `taiga/auth/services.py` | `register_auth_plugin()` — registry that routes `{type:"linkedtrust"}` to the plugin |
| `settings/config.py` | Backend settings: `LINKEDTRUST_URL`, `LINKEDTRUST_CLIENT_ID`, `LINKEDTRUST_CLIENT_SECRET` |

### Setup for a new deployment

1. Register a new confidential client in the IdP's `oidc_clients` table with
   `redirect_uri` set to `{your_frontend_origin}/oauth/callback`
2. Set the frontend env vars (see below) with the client ID and IdP URL
3. Set the backend settings in `settings/config.py`:
   - `LINKEDTRUST_URL` — IdP base URL
   - `LINKEDTRUST_CLIENT_ID` — the client ID from step 1
   - `LINKEDTRUST_CLIENT_SECRET` — the client secret (keep out of version control)

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
