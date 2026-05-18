# Marten — Volunteer-Friendly Feature Plan

**Goal**: Make Marten usable for human rights volunteers without touching Taiga admin.

**Guiding rules** (from CLAUDE.md):
- Don't break the existing Linear-like engineer-facing UI
- Volunteer view is an alternative mode, not a replacement
- Try to contribute upstream before hard-forking

---

## Priority 1 — Team Management (no email required)

### 1.1 Invite user by username (no email)
**Why**: Email may not send, volunteers may not have stable addresses.
**How**: Taiga has an `/invitations` endpoint — POST with `project`, `username`, `role`. User must already exist in Taiga. Add a UI in MembersModal to invite by username.

**Files to touch**:
- `src/lib/api/memberships.ts` — add `createInvitation(projectId, username, roleId)` function
- `src/lib/components/MembersModal.svelte` — add "Invite by username" tab/section alongside the user search

**UI flow**:
- Below the user search, show a text input: "Username of person to add (they must already have a Taiga account)"
- Role selector
- "Add to project" button

### 1.2 Create user account (no email)
**Why**: If a volunteer doesn't have a Taiga account yet, you can't invite them by username.

**Taiga API**: `/auth/register` accepts `username`, `password`, `email`, `full_name`. No email verification required by default (depends on Taiga settings).

**Files to touch**:
- `src/routes/login/+page.svelte` — add "Create account" link / tab
- `src/lib/api/client.ts` — already handles auth, add `register()` helper
- New `src/lib/api/auth.ts` if needed

**UI flow**: Same login page with a "Create account" tab. Username + password + full name (email optional). On success, log in and proceed.

### 1.3 Promote member to admin
**Why**: Volunteers need to be able to make someone else an admin without going into Taiga.
**How**: PATCH `/memberships/{id}` with a new role. Roles list shows all available roles including Admin.

**Files**: Just update MembersModal to allow changing a member's role (dropdown inline, like the role selector on add).

---

## Priority 2 — Board Customization

### 2.1 Configure kanban columns ← already built (in deploy)
**Gear icon → inline editor → add/rename/delete/recolor columns**

### 2.2 Reorder columns
**Why**: Column order matters for volunteer workflows.
**How**: Taiga supports `PATCH /userstory-statuses/{id}` with `order` field. Add drag-to-reorder in ConfigureBoardModal, or up/down buttons next to each column. Save on drop/reorder.

**Files**: Modify `ConfigureBoardModal.svelte` to add drag handles or up/down arrows for each column.

### 2.3 Swimlanes (grouped rows)
**Why**: Some volunteer projects need swimlanes (grouped rows within columns).
**Taiga has**: `/swimlanes` and `/swimlane-userstory-statuses` endpoints.

**Files**:
- `src/lib/api/userstories.ts` — add swimlane API functions
- `src/lib/components/board/Board.svelte` — add swimlane grouping toggle
- New `src/lib/components/board/Swimlane.svelte` component

**UX**: Toggle in board header "Group by swimlane" vs "Flat". Only show if the project has swimlanes configured in Taiga.

---

## Priority 3 — Essential Missing Entities

### 3.1 Tasks
**Why**: Volunteers need sub-tasks within a story.
**Taiga**: `/tasks` CRUD, `POST /tasks` accepts `subject`, `project`, `user_story`, `status`, `assigned_to`, `milestone`.
**Marten today**: `Task` type exists in `types.ts` but no API wrappers, no UI.

**Files**:
- `src/lib/api/tasks.ts` — new file: `getTasks(projectId)`, `createTask()`, `updateTask()`, `deleteTask()`
- Add task sub-list in `IssueModal.svelte` (expandable section at bottom)
- `src/routes/board/+page.svelte` — show task count badge on cards
- New `CreateTaskModal.svelte`

**UX**: Under each story card in the modal, show tasks as a collapsible list. Add new task inline with just a subject field.

### 3.2 Due dates on stories
**Why**: Volunteers need to track deadlines.
**Taiga**: `/userstory-due-dates` endpoint. Stories already have a `due_date` field in Taiga's API response (not exposed in Marten types yet).

**Files**:
- `src/lib/api/types.ts` — add `due_date` to `UserStory`
- `IssueModal.svelte` — show due date picker, save via PATCH story

### 3.3 Wiki pages
**Why**: Volunteers need documentation, process docs, onboarding guides per project.
**Taiga**: `/wiki` and `/wiki-links` endpoints. Paginated, markdown content.

**Files**:
- `src/lib/api/wiki.ts` — new: `getWikiPages(projectId)`, `getWikiPage(id)`, `createWikiPage()`, `updateWikiPage()`, `deleteWikiPage()`
- New route: `src/routes/wiki/+page.svelte`
- Wiki page editor (simple textarea with preview)
- Link wiki pages in sidebar

**UX**: Sidebar item "Wiki". List of pages, click to view/edit. Markdown rendering.

---

## Priority 4 — Search & Navigation

### 4.1 Global search
**Why**: Finding stories/epics/tasks without navigating manually.
**Taiga**: `GET /search?project={id}&text={query}&type={type}` — searches across all entity types.

**Files**:
- `src/lib/api/search.ts` — new
- `src/routes/search/+page.svelte` — search input, results grouped by type (stories, epics, tasks, wiki)
- Add search icon to sidebar

### 4.2 Notifications / activity feed
**Why**: Volunteers need to know when something changes.
**Taiga**: `/web-notifications`, `/notify-policies` endpoints.

**Files**:
- `src/lib/api/notifications.ts` — new
- Bell icon in sidebar header with unread count
- Dropdown showing recent notifications
- `src/routes/notifications/+page.svelte` — full notification center

---

## Priority 5 — Volunteer-Specific UX

### 5.1 Tag management
**Why**: Volunteers need to tag stories (e.g., "urgent", "training-needed", "beginner-friendly").
**Taiga**: `POST /projects/{id}/create_tag`, `POST /projects/{id}/delete_tag`.

**Files**:
- `src/lib/api/projects.ts` — already has `addProjectTag` and `deleteProjectTag`
- Add tag editor in `IssueModal.svelte`
- Add tag filter in board header (click to filter board by tag)

### 5.2 Labels/tags visible on cards
**Why**: Tags like "beginner-friendly" should be visible on board cards without clicking.
**Currently**: `Card.svelte` shows epic tags. Extend to project tags.

### 5.3 Story points — make optional
**Why**: Volunteers may find story points intimidating. Let them hide points or set to ?.
**Files**:
- `Card.svelte` — show points badge, allow ? for unestimated
- `CreateStoryModal.svelte` — no points field (or make optional)
- Taiga allows null points — no backend change needed

### 5.4 Bulk edit / bulk move
**Why**: Volunteers often need to move many stories at once.
**How**: Multi-select in board (checkbox on each card), then move to column / assign to member / add tag.

**Files**:
- `Card.svelte` — add checkbox
- `Board.svelte` — add bulk action toolbar when any checkbox is checked
- `src/lib/api/userstories.ts` — already has `updateUserStory` — use for bulk PATCH

---

## Priority 6 — Fork Strategy

### What we can upstream safely (no fork needed)
- 2.1 (configure columns)
- 2.2 (reorder columns)
- 3.1 (tasks — if structured as opt-in view)
- 5.1–5.4 (tags, labels, points, bulk edit)

These don't change the Linear-like experience — they're additions.

### What likely needs a fork or branch
don't do these yet
we don't need the wiki yet, we might do that differently
its ok to include these in the main these are also useful to devs
- 3.3 (wiki) — not in upstream Marten, would need to be added as a new route
- 4.1 (global search) — new page, could be upstreamed but may not align with Linear UX goals
- 4.2 (notifications) — same
- 2.3 (swimlanes) — Taiga has these, Marten doesn't, this is a bigger feature

### When to consider a hard fork
If any volunteer-friendly feature fundamentally changes how the board works in a way that upstream Marten wouldn't want — that's when we'd fork. But per CLAUDE.md: "try to avoid forking unless necessary."

**For now**: Work in feature branches on the Cooperation-org fork. Open PRs to upstream when the feature is clearly safe for the engineer UX.

---

## Implementation Order

| # | Feature | Priority | Fork risk | Notes |
|---|---------|----------|-----------|-------|
| 1.1 | Invite by username | HIGH | None | Small, safe |
| 1.2 | Create account | HIGH | None | Login page change |
| 1.3 | Change member role | HIGH | None | Inline dropdown |
| 2.1 | Configure columns | HIGH | None | Already built |
| 2.2 | Reorder columns | MEDIUM | None | Order field in modal |
| 3.1 | Tasks | MEDIUM | Low | Sub-list in story modal |
| 3.2 | Due dates | MEDIUM | None | Add field to story modal |
| 5.2 | Tags on cards | MEDIUM | None | Visible on Card.svelte |
| 5.3 | Story points optional | MEDIUM | None | Card + modal change |
| 4.1 | Global search | MEDIUM | Low | New route |
| 3.3 | Wiki pages | MEDIUM | Medium | New route, substantial |
| 4.2 | Notifications | LOW | Low | Bell icon + dropdown |
| 2.3 | Swimlanes | LOW | High | Significant board change |
| 5.4 | Bulk edit | LOW | None | Checkbox + toolbar |

---

## Taiga API endpoints reference (what Marten has vs doesn't)

### Already wrapped in Marten
`GET/POST /projects` · `PATCH /projects/{id}` · `POST /projects/{id}/create_tag` · `DELETE /projects/{id}/delete_tag`
`GET /userstory-statuses` · `GET /userstories` · `POST /userstories` · `PATCH /userstories/{id}`
`GET /epics` · `POST /epics` · `PATCH /epics/{id}` · `DELETE /epics/{id}`
`GET /milestones` · `GET /userstories` (via milestone)
`GET/POST /memberships` · `DELETE /memberships/{id}`
`GET /roles` · `GET /users`
`POST /auth` · `POST /auth/refresh`

### Needs API wrapper + UI
`POST /invitations` — team management
`POST /tasks` · `PATCH /tasks/{id}` · `DELETE /tasks/{id}` — tasks
`GET /wiki` · `POST /wiki` · `PATCH /wiki/{id}` · `DELETE /wiki/{id}` — wiki
`GET /search` — global search
`GET /web-notifications` · `PATCH /web-notifications/{id}` — notifications
`PATCH /userstory-statuses/{id}` with `order` — reorder columns
`GET/POST /swimlanes` — swimlanes
`GET /priorities` · `GET /severities` · `GET /issue-types` · `GET /issue-statuses` — for issue support

### Not needed for MVP
`/user-story-due-dates` · `/task-due-dates` · `/issue-due-dates` — due dates only after basic tasks exist
`/stats` · `/reports` — only after basic velocity is expanded
`/project-templates` — only if we add project creation wizard
`/importers` · `/webhooks` — integration work, later

---

## Testing strategy

- `cd /opt/apps/marten && npm run test` — vitest unit tests
- `npm run check` — TypeScript + Svelte type check
- Manual test at `help.raisethevoices.org` after each deploy
- Test with a volunteer account (non-admin) to ensure no admin-gated features are accessible
