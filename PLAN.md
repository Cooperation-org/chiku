# Marten: Linear-like Taiga Frontend

## Deployment

**URL**: https://marten.linkedtrust.us

**Source**: `/home/ubuntu/marten`

**Build output**: `/home/taiga/marten-build`

**Required `.env`** (in `/home/ubuntu/marten/.env`). These are build-time
`PUBLIC_*` vars baked into the bundle — **you must rebuild after changing them.**
```
PUBLIC_LINKEDTRUST_URL=https://live.linkedtrust.us
# Per-host LinkedTrust OIDC client_id (public; from the IdP oidc_clients table):
#   marten.linkedtrust.us   -> lt_4d81bf7637dc5659b9f71f8e
#   help.raisethevoices.org -> lt_820c9c9a3c5c1db0049790f4
PUBLIC_LINKEDTRUST_CLIENT_ID=lt_4d81bf7637dc5659b9f71f8e
```
> ⚠️ If `PUBLIC_LINKEDTRUST_CLIENT_ID` is empty, the "Sign in with LinkedTrust"
> button silently no-ops (it sets "LinkedTrust login is not configured" and
> returns without redirecting). **That is the #1 cause of "LinkedTrust login
> does nothing."** The IdP and the taiga-back `linkedtrust` plugin are fine — it's
> purely this missing build-time var.

**Deploy commands**:
```bash
cd /home/ubuntu/marten
git pull
# ensure .env has PUBLIC_LINKEDTRUST_CLIENT_ID set (see above), then:
npm run build
sudo rm -rf /home/taiga/marten-build/*
sudo cp -r build/* /home/taiga/marten-build/
sudo chown -R taiga:taiga /home/taiga/marten-build
```

**Nginx config**: `/etc/nginx/conf.d/marten.conf`
- Static files from `/home/taiga/marten-build`
- API proxied to Taiga backend at `127.0.0.1:8001`
- Media proxied to `127.0.0.1:8003`

**Taiga API**: https://taiga.linkedtrust.us/api/v1/

---

## Design Principles
- **Fast and snappy**: Optimistic updates, instant feedback
- **Minimal UI**: Only show what's needed
- **Keyboard-first**: Shortcuts for everything
- **Dark theme**: Easy on the eyes

---

## Current State
- [x] Project list with archive/unarchive
- [x] Create project modal
- [x] Edit project (right-click menu)
- [x] Delete project with confirmation
- [x] Basic board view with drag-and-drop
- [x] Issue detail modal (central popup)
- [x] Edit issue (title, description, status, assignee)
- [x] Delete issue with confirmation
- [x] Backlog view
- [x] Epics view
- [x] Velocity chart

---

## Next Up
- [ ] Project settings page (members, statuses)
- [ ] Filters & views on board
- [ ] Keyboard shortcuts

---

## Future Features

### Board Improvements
- Filters (by assignee, epic, label)
- Save custom views
- Toggle closed issues
- Swimlanes (group by epic/assignee)

### Issue Detail Enhancements
- Rich markdown editor
- @mentions
- Comments/activity feed
- Paste images

### Project Management
- Project settings page
- Manage members
- Configure statuses

### Advanced
- Bulk actions (multi-select, bulk status change)
- Keyboard shortcuts
- Global search

---

## Technical Notes

### State Management
- Svelte stores for global state
- Optimistic updates everywhere

### API
- Uses Taiga REST API v1
- Auth via Bearer token in localStorage
- Main endpoints:
  - `/projects` - CRUD projects
  - `/userstories` - CRUD issues
  - `/userstory-statuses` - status definitions
  - `/users?project=X` - project members
