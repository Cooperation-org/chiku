// Sample data for the public demo build (VITE_DEMO=1). No real board is read:
// the stories are Chiku's own commit subjects from its public repository,
// the people are role names, and the build talks to no server at all.
import type {
	Epic,
	EpicRef,
	Membership,
	Milestone,
	Point,
	Project,
	Role,
	User,
	UserStory,
	UserStoryStatus
} from '$lib/api/types';

import { DEMO_SLUG } from './index';
export { DEMO_SLUG };
const PID = 1;

function person(id: number, name: string, color: string): User {
	return {
		id,
		username: name.toLowerCase().replace(/\s+/g, '-'),
		full_name: name,
		full_name_display: name,
		email: '',
		photo: null,
		big_photo: null,
		color
	};
}

export const users: User[] = [
	person(1, 'Design Lead', '#a78bfa'),
	person(2, 'Frontend Dev', '#22d3ee'),
	person(3, 'Backend Dev', '#f59e0b')
];

const st = (id: number, name: string, color: string, order: number, is_closed = false): UserStoryStatus => ({
	id,
	name,
	slug: name.toLowerCase().replace(/\s+/g, '-'),
	color,
	is_closed,
	order,
	project: PID
});

export const statuses: UserStoryStatus[] = [
	st(1, 'New', '#70728F', 1),
	st(2, 'Ready', '#E44057', 2),
	st(3, 'In progress', '#E47C40', 3),
	st(4, 'Ready for test', '#E4CE40', 4),
	st(5, 'Done', '#A8E440', 5, true)
];

const roles: Role[] = [
	{ id: 1, name: 'Front', computable: true, order: 1, project: PID },
	{ id: 2, name: 'Back', computable: true, order: 2, project: PID }
];

const points: Point[] = [
	{ id: 1, name: '?', value: null, order: 1, project: PID },
	{ id: 2, name: '1', value: 1, order: 2, project: PID },
	{ id: 3, name: '2', value: 2, order: 3, project: PID },
	{ id: 4, name: '3', value: 3, order: 4, project: PID },
	{ id: 5, name: '5', value: 5, order: 5, project: PID },
	{ id: 6, name: '8', value: 8, order: 6, project: PID }
];

export const project: Project = {
	id: PID,
	name: 'Chiku demo',
	slug: DEMO_SLUG,
	description: 'Sample board. Stories are taken from the Chiku repository history.',
	created_date: '2026-01-25T00:00:00Z',
	modified_date: '2026-11-12T00:00:00Z',
	owner: users[0],
	members: users.map((u) => u.id),
	is_private: false,
	total_milestones: 3,
	total_story_points: 0,
	is_kanban_activated: true,
	is_backlog_activated: true,
	is_epics_activated: true,
	is_issues_activated: false,
	is_wiki_activated: false,
	us_statuses: statuses,
	task_statuses: [],
	points,
	roles,
	tags: [],
	tags_colors: {},
	i_am_admin: false,
	i_am_owner: false,
	i_am_member: false,
	my_permissions: ['view_project', 'view_us', 'view_epics', 'view_milestones']
};

export const memberships: Membership[] = users.map((u, i) => ({
	id: i + 1,
	user: u.id,
	project: PID,
	role: i === 2 ? 2 : 1,
	role_name: i === 2 ? 'Back' : 'Front',
	full_name: u.full_name,
	email: '',
	color: u.color,
	photo: null,
	is_admin: false,
	is_active: true,
	is_owner: false
}));

const epicDefs = [
	{ id: 1, subject: 'Board and story detail', color: '#22d3ee' },
	{ id: 2, subject: 'Sign in', color: '#a78bfa' },
	{ id: 3, subject: 'Team dashboard links', color: '#f59e0b' }
];

const sprintDefs = [
	{ id: 1, name: 'Sprint 1', start: '2026-06-01', finish: '2026-06-14', closed: true },
	{ id: 2, name: 'Sprint 2', start: '2026-07-13', finish: '2026-07-26', closed: true },
	{ id: 3, name: 'Sprint 3', start: '2026-11-09', finish: '2026-11-22', closed: false }
];

// [subject, status, assignee, points, epic, sprint, date, description]
type Row = [string, number, number | null, number | null, number | null, number | null, string, string];
const rows: Row[] = [
	['Add comments support to user story modal', 5, 2, 3, 1, 1, '2026-06-06', ''],
	['Add custom kanban columns: editor with drag-drop reorder, create board from existing', 5, 2, 5, 1, 1, '2026-06-06', ''],
	['Project routes, full-screen story detail, editable names, due dates on cards', 5, 2, 5, 1, 1, '2026-06-09', 'Project-scoped URLs: /p/<project-slug>/board, /backlog, /epics, /velocity'],
	['Add "Sign in with LinkedTrust" as primary login; trim login options', 5, 3, 3, 2, 1, '2026-06-14', 'Sign in with LinkedTrust (team OIDC provider, brokers Google + Bluesky), plus optional direct Google OAuth, Bluesky, and Taiga password login'],
	['Preserve deep-linked URL through login round-trip', 5, 3, 2, 2, 2, '2026-07-19', 'Story detail view with comments, deep-linkable via ?story=<ref>'],
	['Remove broken Create Account tab and dead client-side OIDC helper', 5, 3, 1, 2, 2, '2026-07-19', ''],
	['SSO relay: sign in via LinkedTrust, bounce back to an allowlisted partner app', 5, 3, 5, 3, 2, '2026-07-24', ''],
	['Story attachments: upload, download, inline markdown preview; show story creator', 5, 2, 5, 1, 2, '2026-07-28', 'Markdown attachments render inline, other text files show as plain text, images show inline.'],
	['Estimate a story from the card you already have open', 5, 2, 2, 1, 2, '2026-07-28', 'Estimate a story from its card: pick from the project\'s points, or clear it.'],
	['Tasks dashboard: text search + filters', 4, 2, 3, null, 3, '2026-08-10', ''],
	['A posted comment stays in the thread, and the box has room to write in', 4, 2, 2, 1, 3, '2026-08-18', ''],
	['Members: only a project admin is offered add/remove', 3, 3, 2, null, 3, '2026-08-27', ''],
	['Two people named J no longer share one avatar', 3, 1, 1, null, 3, '2026-08-27', ''],
	['nav: find the cohort bar from the page host when no address is pinned', 2, 1, 2, 3, 3, '2026-08-31', ''],
	['Board: a drag saves the card\'s position in its column to Taiga', 2, 2, 3, 1, 3, '2026-11-12', 'A drop saves the column (status PATCH) and the position in it (bulk_update_kanban_order), shown optimistically'],
	['Read-only demo board anyone can open', 1, null, null, 3, null, '2026-11-18', ''],
	['Velocity charts and sprint projections', 1, null, 5, null, null, '2026-11-18', ''],
	['Backlog list view', 1, 1, 3, null, null, '2026-11-18', '']
];

function epicRef(id: number): EpicRef {
	const e = epicDefs.find((d) => d.id === id)!;
	return { id: e.id, ref: 100 + e.id, subject: e.subject, color: e.color, project: { id: PID, name: project.name, slug: DEMO_SLUG } };
}

export const stories: UserStory[] = rows.map(([subject, status, who, pts, epic, sprint, date, description], i) => {
	const s = statuses.find((x) => x.id === status)!;
	const sp = sprintDefs.find((x) => x.id === sprint);
	const pointId = pts === null ? 1 : points.find((p) => p.value === pts)!.id;
	const stamp = `${date}T12:00:00Z`;
	return {
		id: i + 1,
		ref: i + 1,
		version: 1,
		subject,
		description,
		status,
		status_extra_info: { name: s.name, color: s.color, is_closed: s.is_closed },
		assigned_to: who,
		assigned_to_extra_info: who ? users.find((u) => u.id === who)! : null,
		owner: 1,
		owner_extra_info: users[0],
		project: PID,
		project_extra_info: { id: PID, name: project.name, slug: DEMO_SLUG },
		milestone: sp?.id ?? null,
		milestone_name: sp?.name ?? null,
		milestone_slug: sp ? sp.name.toLowerCase().replace(/\s+/g, '-') : null,
		is_closed: s.is_closed,
		points: { '1': pointId, '2': 1 },
		total_points: pts,
		kanban_order: i,
		backlog_order: i,
		sprint_order: i,
		created_date: stamp,
		modified_date: stamp,
		due_date: null,
		due_date_status: 'not_set',
		tags: [],
		epics: epic ? [epicRef(epic)] : null
	};
});

project.total_story_points = stories.reduce((n, s) => n + (s.total_points || 0), 0);

export const epics: Epic[] = epicDefs.map((e) => {
	const mine = stories.filter((s) => s.epics?.some((r) => r.id === e.id));
	const done = mine.filter((s) => s.is_closed).length;
	const status = done === mine.length ? statuses[4] : statuses[2];
	return {
		id: e.id,
		ref: 100 + e.id,
		subject: e.subject,
		description: '',
		status: status.id,
		status_extra_info: { name: status.name, color: status.color, is_closed: status.is_closed },
		assigned_to: null,
		assigned_to_extra_info: null,
		owner: 1,
		project: PID,
		color: e.color,
		created_date: '2026-06-01T12:00:00Z',
		modified_date: '2026-11-12T12:00:00Z',
		user_stories_counts: { total: mine.length, progress: done }
	};
});

export const milestones: Milestone[] = sprintDefs.map((m) => {
	const mine = stories.filter((s) => s.milestone === m.id);
	const sum = (list: UserStory[]) => list.reduce((n, s) => n + (s.total_points || 0), 0);
	return {
		id: m.id,
		name: m.name,
		slug: m.name.toLowerCase().replace(/\s+/g, '-'),
		project: PID,
		estimated_start: m.start,
		estimated_finish: m.finish,
		created_date: `${m.start}T00:00:00Z`,
		modified_date: `${m.finish}T00:00:00Z`,
		closed: m.closed,
		total_points: sum(mine),
		closed_points: sum(mine.filter((s) => s.is_closed)),
		user_stories: mine
	};
});
