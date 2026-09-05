# Taiga feature coverage — findings & roadmap

Research source: official Taiga REST API reference (docs.taiga.io/api.html).
Our backend (taiga.workers.vc) is the standard Taiga REST API + the
`django-linkedtrust-auth` SSO plugin. **Constraint: backend is read-only for
us — everything ships as frontend/API usage.**

## What we already leverage

| Area | Endpoints in use |
|---|---|
| Auth | `POST /auth`, `/auth/refresh` (+ SSO via plugin; Google/ATProto) |
| Projects | list/create/get/get-by-slug/edit/delete, `bulk_update_order`, `create_tag`/`delete_tag` (archive via `archived` tag), modules flags (read-only) |
| Memberships & roles | list/create/delete, roles list |
| User stories | list (paged), create/get/edit/delete, optimistic status PATCH |
| US statuses | list/create/edit/delete, `bulk_update_order` |
| Points | read (`pointChoices`) |
| Epics | list/create/edit/delete |
| Milestones | list (velocity page) |
| History | comments via `PATCH /userstories/{id}` `comment` |
| Attachments | story attachments CRUD + inline preview |
| Users | me, edit, avatar |

## The gap — grouped by value

### A. Make existing views genuinely better (Phase 1)

| Feature | API | UI |
|---|---|---|
| In-column reorder persisted | `POST /userstories/bulk_update_kanban_order` — body `{ project_id, bulk_stories: [{ order, us_id }] }` | Board drag within a column reorders + persists (currently a visual no-op) |
| Backlog reorder | `POST /userstories/bulk_update_backlog_order` — same shape | (future: drag rows on backlog) |
| Real deep links | `GET /userstories/by_ref?ref=&project=` | Single-story page resolves any ref without loading the whole list |
| Server-side filtering | list params: `status`, `status__is_closed`, `assigned_to`, `tags`, `milestone`, `epic`, `watchers`, `exclude_*` | My Tasks closed-toggle goes server-side; big projects stop breaking the 100-story page limit |
| Search | `GET /search?project=&text=` (project is **required**) → `{ count, userstories[], epics[], tasks[], issues[], wiki_pages[] }` — items are `{ id, ref, subject, status, assigned_to }` | The topbar "Search or go to…" becomes a working palette |
| Prev/next story | US detail GET includes `neighbors: { next: { id, ref, subject }, previous: … }` | Prev/next buttons on the story page |
| Blocked stories | `is_blocked` + `blocked_note` on US | Board card badge + story-page banner (display; editing later) |
| Filters-data | `GET /userstories/filters_data?project=` | (deferred until backlog has a filter bar) |

### B. New modules (Phase 2/3/4)

- **Tasks (sub-items of stories)** — `GET /tasks?user_story=X`, bulk-create, task
  statuses, task attachments. Story page gets a Tasks section; note the US detail
  object embeds `tasks` and `total_tasks`.
- **Epics done right** — `related_userstories` (link/unlink/bulk), epic statuses
  module, epic filters data, epic attachments.
- **Wiki** — pages + history + attachments + wiki links (honors `is_wiki_activated`).
- **Issues** — second work item type with types/priorities/severities + `issues_stats`.
- **Custom fields** — epic/US/task custom attributes + values (per-project typed fields).

### C. Social / collaboration

- **Watchers & votes** — watch/unwatch + `watchers` lists on every object; votes on
  epics/stories/tasks; `is_watcher`/`is_voter` flags on detail objects; `GET /users/{id}/watched`.
- **Comment edit/delete/undelete** — history endpoints (`history/edit_comment`, `delete_comment`).
- **Multi-assignee** — US detail carries `assigned_users` (plural) beyond `assigned_to`.
- **Notify policies** — per-project email notification settings.
- **Contact project admin** (`POST /contact`).

### D. Project management / settings surface

- **Modules config editor** — `GET/PATCH /projects/{id}/modules` (toggle modules from the UI).
- **Milestones full CRUD** — create/edit/close sprints + `milestones/{id}/stats` (real burndown).
- **Project stats** — `GET /projects/{id}/stats` (+ `issues_stats`).
- **Logo** upload/remove; **project duplicate**; **leave project**; **ownership transfer**
  (validate/request/start/accept/reject); **export/import dump**; **webhooks** (+logs);
  **project templates** (`create_template`, `project-templates` list → create from Scrum/Kanban).

### E. Misc

- **User storage** — per-user server KV (`/user-storage`) — could sync UI prefs.
- **Locales** — i18n data. **Throttling** — watch for 429s. **Pagination headers** —
  `x-pagination-count` etc. (we parse none today; getAllUserStoriesPaged walks pages).
- **Importers** — Trello/GitHub/Jira (server-side feature, UI only).
- **User lifecycle** — change email/password, password recovery, cancel account.

## Roadmap

1. **Phase 1 — "make it feel real"** (in progress): bulk kanban-order persistence,
   by-ref deep links, server-side filters where they pay off, search palette,
   prev/next story navigation, blocked badge/banner.
2. **Phase 2 — story depth**: tasks (sub-items) on the story page, comment
   edit/delete via history, multi-assignee, watchers/votes.
3. **Phase 3 — planning**: epics + related userstories + epic statuses, milestones
   full CRUD + burndown (`milestones/{id}/stats`), project stats.
4. **Phase 4 — surfaces**: Wiki module, Issues module, custom fields.
5. **Phase 5 — settings/admin**: modules editor, notify policies, webhooks,
   export/import, templates, logo, leave/transfer.
6. **Parked**: taiga-events real-time (websockets) — skipped by decision; cheap
   alternative is aggressive refetching (window-focus / short intervals).

## Phase 2 — story depth (detailed plan)

Goal: make the story page a complete workbench — sub-tasks, editable history,
broader assignment, and follow buttons.

### 2.1 Tasks (sub-items)

Taiga tasks are checklist items owned by a story: `subject` (+`status` id),
optional `description`, `assigned_to`, `milestone`, `tags`, `us_order`.
US detail embeds `tasks` (ids) and `total_tasks`.

- API (`src/lib/api/tasks.ts`, new): `getStoryTasks(userStoryId)` via
  `GET /tasks?user_story=X`; `createTask({ project, subject, user_story, status? })`;
  `updateTask(id, data)` (status, assignee, subject); `deleteTask(id)`;
  `getTaskStatuses(projectId)` (`GET /task-statuses?project=`).
- Keys (extend `qk`): `tasks: (projectId, storyId) => ["project", projectId, "story", storyId, "tasks"]`,
  `taskStatuses: (projectId) => ["project", projectId, "task-statuses"]`.
- UI: **Tasks section** on the story page below description, above attachments —
  checklist rows (checkbox toggles `status` to the project's closed task status),
  inline add (Enter), per-row assignee + delete. Progress line (`done/total`).
- Assertions: `GET /tasks?user_story=<id>` 200; create with `{ project, subject,
  user_story }` 201; status PATCH 200. Default new-task status = first task status.

### 2.2 Comment editing + deletion

History API (`GET /history/userstory/{id}` read stays as is; comments have ids):
- `PUT /history/edit_comment/{commentId}` with `{ comment }`
- `POST /history/delete_comment/{commentId}`, `POST /history/undelete_comment/{commentId}`
- Add to `src/lib/api/comments.ts`: `editComment`, `deleteComment`, `undeleteComment`;
  extend the comments query mutation to patch the thread in place.
- UI: per-comment `⋯` menu in the story thread (Edit → inline textarea;
  Delete → tombstone with Undo while the page lives).

### 2.3 Multi-assignee

US detail carries `assigned_users` (plural user ids) alongside `assigned_to`.
- API: `updateUserStory(id, { assigned_users: [...] })` — PATCH already accepts it.
- UI: story meta row gains an "Also assigned" avatar-stack + picker (multi-select
  from project members). Keep `assigned_to` (owner) semantics untouched.

### 2.4 Watchers & votes

- API (`src/lib/api/watchers.ts`, new): story watch/unwatch/list-watchers;
  `GET /users/me` → or dedicated `watchers` field on US detail (`watchers`,
  `is_watcher`, `total_watchers`); same shape for epics.
- UI: "Watch" button on the story header (eye icon, `is_watcher` state);
  voter count display where `total_voters > 0`.
- Own-feed: `GET /users/{id}/watched` powers a "Watched" filter on My Tasks later.

### Phase 2 verification

- Checklist round-trip: create/toggle/delete task on a story survives reload.
- Comment edit/delete/undo visible in-thread.
- Multi-assignee persists via PATCH.
- Watch toggle flips `is_watcher`.

## Phase 3 — planning (detailed plan)

### 3.1 Epics + related user stories

- API (`epics.ts` extend): `GET/POST /epics/{id}/related_userstories`
  (`{ epic, user_story }` for link, DELETE same path for unlink),
  `GET /epics/by_ref?ref=&project=`, epic statuses module
  (`/epic-statuses?project=`), epic filters data, epic attachments
  (`/epics/attachments?object_id=`).
- Keys: `epicStories: (epicId) => ["epic", epicId, "stories"]`,
  `epicStatuses: (projectId) => ["project", projectId, "epic-statuses"]`.
- UI: Epic dialog gains a **Stories tab** (list from `related_userstories`,
  "Link story" picker — search by ref/subject, unlink per row); epic view page
  stays canonical list, progress bars now count linked stories.
- Deep links: `/p/<slug>/epics/<ref>` single-epic view (same by-ref pattern).

### 3.2 Milestones full CRUD + real burndown

- API (`milestones.ts` extend): `createMilestone({ project, name,
  estimated_start, estimated_finish })`, `updateMilestone(id, { closed, … })`,
  `deleteMilestone(id)`, `GET /milestones/{id}/stats` (burndown series).
- UI: velocity page becomes a **sprint planner** — milestone list with
  create/edit dialog, close/open toggle, per-sprint burndown chart from the
  stats endpoint (replacing the hand-rolled bars when data is present).
- Keys: existing milestone keys; `milestoneStats: (id) => ["milestone", id, "stats"]`.

### 3.3 Project stats

- API: `GET /projects/{id}/stats` (defined vs closed points, per-status counts),
  `GET /projects/{id}/issues_stats` (reported only if we build Issues).
- UI: small stat cards on the project header or a `/p/<slug>/overview` page —
  decided at build time with the user.

### Phase 3 verification

- Link/unlink story↔epic round-trip; epic deep link works.
- Create/close a sprint from the velocity page; burndown renders from `/stats`.
- Project stats cards match the numbers on the board.

## Phase 4 — surfaces (detailed plan)

### 4.1 Wiki module

- API (`src/lib/api/wiki.ts`, new): list (`GET /wiki?project=`), create
  (`{ project, slug, content }`), `GET /wiki/{id}`, `GET /wiki/by_slug?slug=&project=`,
  edit, delete, watchers, attachments (`/wiki/attachments?object_id=`).
- Routes: `/p/<slug>/wiki` (index of pages) + `/p/<slug>/wiki/<page-slug>`
  (`single-wiki-page.tsx`, markdown renderer reuse), honoring
  `is_wiki_activated`; sidebar "Docs" item when enabled.
- Sidebar gains a Wiki item only when the module flag is on.

### 4.2 Issues module

Second work-item type — only if wanted; big surface, planned in one pass:
- API (`src/lib/api/issues.ts`, new): list/create/get/edit/delete,
  `GET /issues/filters_data`, `/issue-statuses?project=`, `/issue-types`,
  `/priorities`, `/severities`, attachments, watchers/votes, `by_ref`.
- Fields: `subject`, `description`, `status`, `type`, `priority`, `severity`,
  `assigned_to`, `milestone`, tags, due dates.
- UI: `/p/<slug>/issues` list (+ create), `/p/<slug>/issues/<ref>` detail
  reusing the modal patterns; sidebar item honoring `is_issues_activated`;
  backlog gets an Issues toggle or the views stay separate (user call).

### 4.3 Custom fields

- API: `/{object}-custom-attributes?project=` (epic/us/task) + 
  `/{object}/custom-attributes-values/{id}` GET/PUT.
- UI: story page "Custom fields" section rendering attribute definitions
  (name/type) with editable values; deferred to its own pass once Phase 2
  lands.

### Phase 4 verification

- Wiki CRUD + deep links render markdown; disabled flag hides the section.
- Issues CRUD with type/priority/severity selects; stats match `issues_stats`.
- Custom values round-trip on a story.

## Phase 5 — settings/admin (detailed plan)

- **Modules editor**: `GET/PATCH /projects/{id}/modules`
  (`{ is_kanban_activated, is_backlog_activated, is_epics_activated,
  is_wiki_activated, is_issues_activated }`) — toggles from Project settings.
- **Notify policies**: `GET /notify-policies?project=` + `PATCH /notify-policies/{id}`
  (`{ notify_level }`) — per-project email level UI in settings.
- **Webhooks** (`/webhooks` + `/webhooklogs`): list/create/edit/delete/test
  from Project settings; logs viewer with resend.
- **Export/import**: `GET /exporter/{projectId}` (sync → dump download;
  async → 202 + `export_id` poll to MEDIA_URL/exports) — "Download backup"
  button in settings.
- **Templates**: `POST /projects/{id}/create_template`, `GET /project-templates` —
  "create project from template" in the New project dialog.
- **Logo**: `POST /projects/{id}/change_logo` (multipart `logo=@file`) +
  `remove_logo` — BrandLogo prefers the project's `logo_small_url` when set.
- **Leave project** (`POST /projects/{id}/leave`), **ownership transfer**
  (validate/request/start/accept/reject — owner-only flow),
  **project duplicate** (`POST /projects/{id}/duplicate`).
- **Feedback**: `POST /feedback` — "Send feedback" from the account page.
- **Contact admin**: `POST /contact` where surfaced.

### Phase 5 verification

- Module toggles flip sidebar sections on next load.
- Notify level persists; webhook test delivers + log row appears.
- Export downloads a dump; duplicate creates a full copy.

## Phase 1 API assertions (taiga.workers.vc)

Probed anonymously (project 13 = `lynxmonde`) — **all endpoints exist and respond**:

| Probe | Result |
|---|---|
| `GET /userstories/by_ref?ref=1&project=13` | **200** — full detail: `neighbors` (prev/next refs), `is_blocked`, `blocked_note` |
| `GET /userstories/by_ref?ref=999&project=13` | **404** — clean not-found signal |
| `GET /search?project=13&text=the` | **200** |
| `GET /userstories/filters_data?project=13` | **200** |
| `POST /userstories/bulk_update_kanban_order` (no auth/body) | **400** — exists (validation rejects empty); full write verified via the app session |
| `POST /userstories/bulk_update_backlog_order` (no auth/body) | **400** — exists |

Payload shapes (verified against the live backend — **the public docs differ**,
use these, not the docs):
- bulk kanban order: `{ project_id, status_id, bulk_userstories: [id, id, …] }`
  — a **flat id array in the new order**, not `{us_id, order}` objects
  (the server answers `bulk_userstories: Enter a whole number` otherwise);
  backlog order same shape without `status_id`
- search response: `{ count, userstories[], epics[], tasks[], issues[], wiki_pages[] }`,
  items are `{ id, ref, subject, status, assigned_to }` — no slug; navigate via the
  active project slug
- US detail embeds `neighbors`, `tasks`, `total_tasks`, `total_watchers`, `is_watcher`

## Constraints

- Backend is **read-only** for this project: no settings, plugins, or services
  may be changed server-side.
- `search` requires a `project` id → the palette is scoped to the active project.
- Anon access is open on this deployment; authed features still require the
  Bearer token.
