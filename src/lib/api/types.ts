// Taiga API types

/** One row of GET /projects/{id}/stats — remaining points per sprint. */
export interface ProjectSprintStat {
	name: string;
	optimal: number | null;
	evolution: number | null;
	"team-increment": number | number[] | null;
	"client-increment": number | number[] | null;
}

/** GET /projects/{id}/stats — agile totals plus the per-sprint series. */
export interface ProjectStats {
	name: string;
	total_milestones: number;
	total_points: number | null;
	defined_points: number;
	closed_points: number;
	assigned_points: number;
	defined_points_per_role: Record<string, number>;
	closed_points_per_role: Record<string, number>;
	assigned_points_per_role: Record<string, number>;
	milestones: ProjectSprintStat[];
	speed: number;
}

export interface User {
	id: number;
	username: string;
	full_name: string;
	full_name_display: string;
	email: string;
	photo: string | null;
	big_photo: string | null;
	color: string;
}

export interface Project {
	id: number;
	name: string;
	slug: string;
	description: string;
	created_date: string;
	modified_date: string;
	owner: User;
	members: number[];
	is_private: boolean;
	total_milestones: number;
	total_story_points: number;
	is_kanban_activated: boolean;
	is_backlog_activated: boolean;
	is_epics_activated: boolean;
	is_issues_activated: boolean;
	is_wiki_activated: boolean;
	is_contact_activated?: boolean;
	us_statuses: UserStoryStatus[];
	task_statuses: TaskStatus[];
	points: Point[];
	roles: Role[];
	tags: string[];
	tags_colors: Record<string, string>;
	/** Taiga gates member changes on project admin; it tells us here. */
	i_am_admin?: boolean;
	i_am_owner?: boolean;
	i_am_member?: boolean;
	my_permissions?: string[];
	/** Visibility permission sets (who may view when public / anonymous). */
	anon_permissions?: string[];
	public_permissions?: string[];
	/** Owner's notification level for this project (null when not a member). */
	notify_level?: number | null;
	blocked_code?: string | number | null;
	logo_small_url?: string | null;
	logo_big_url?: string | null;
	creation_template?: number | null;
	/** Backend defaults for newly created objects. */
	default_epic_status?: number | null;
	default_us_status?: number | null;
	default_task_status?: number | null;
	default_points?: number | null;
	default_priority?: number | null;
	default_severity?: number | null;
	default_issue_status?: number | null;
	default_issue_type?: number | null;
	total_closed_milestones?: number;
	is_watcher?: boolean;
	total_watchers?: number;
}

export interface UserStoryStatus {
	id: number;
	name: string;
	slug: string;
	color: string;
	is_closed: boolean;
	order: number;
	project: number;
}

export interface TaskStatus {
	id: number;
	name: string;
	slug: string;
	color: string;
	is_closed: boolean;
	order: number;
	project: number;
}

export interface Point {
	id: number;
	name: string;
	value: number | null;
	order: number;
	project: number;
}

export interface Role {
	id: number;
	name: string;
	/** Whether estimates given to this role count towards a story's total. */
	computable: boolean;
	order: number;
	project: number;
}

export interface UserStory {
	id: number;
	ref: number;
	version: number;
	subject: string;
	description: string;
	status: number;
	status_extra_info: {
		name: string;
		color: string;
		is_closed: boolean;
	};
	assigned_to: number | null;
	assigned_to_extra_info: User | null;
	owner: number;
	owner_extra_info: User;
	project: number;
	project_extra_info: {
		id: number;
		name: string;
		slug: string;
	};
	milestone: number | null;
	milestone_name: string | null;
	milestone_slug: string | null;
	is_closed: boolean;
	/** Taiga estimates per role: role id (as a string) -> point option id. */
	points: Record<string, number>;
	total_points: number | null;
	kanban_order: number;
	backlog_order: number;
	sprint_order: number;
	created_date: string;
	modified_date: string;
	due_date: string | null;
	due_date_status: string | null;
	tags: [string, string | null][];
	epics: EpicRef[] | null;
	is_blocked: boolean;
	blocked_note: string | null;
	
	/** Prev/next story in the project nav chain. */
	neighbors: {
		next: { id: number; ref: number; subject: string } | null;
		previous: { id: number; ref: number; subject: string } | null;
	} | null;
}

/** Taiga attachment (userstories/tasks/issues share this shape). */
export interface Attachment {
	id: number;
	project: number;
	/** User id of whoever uploaded it Ã¢â‚¬â€ resolve against project members for a name. */
	owner: number;
	name: string;
	/** Storage-relative path. Use `url` to fetch; it carries the access token. */
	attached_file: string;
	size: number;
	/** Signed, absolute media URL Ã¢â‚¬â€ usable directly as href/src without an auth header. */
	url: string;
	preview_url: string | null;
	thumbnail_card_url: string | null;
	description: string;
	is_deprecated: boolean;
	from_comment: boolean;
	created_date: string;
	modified_date: string;
	/** Id of the story/task/issue this is attached to. */
	object_id: number;
	order: number;
	sha1: string;
}

export interface EpicRef {
	id: number;
	ref: number;
	subject: string;
	color: string;
	project: {
		id: number;
		name: string;
		slug: string;
	};
}

export interface Epic {
	id: number;
	ref: number;
	subject: string;
	description: string;
	status: number;
	status_extra_info: {
		name: string;
		color: string;
		is_closed: boolean;
	};
	assigned_to: number | null;
	assigned_to_extra_info: User | null;
	owner: number;
	project: number;
	color: string;
	created_date: string;
	modified_date: string;
	user_stories_counts: {
		total: number;
		progress: number;
	};
}

export interface Task {
	id: number;
	ref: number;
	subject: string;
	description: string;
	status: number;
	status_extra_info: {
		name: string;
		color: string;
		is_closed: boolean;
	};
	assigned_to: number | null;
	assigned_to_extra_info: User | null;
	user_story: number | null;
	project: number;
	milestone: number | null;
	created_date: string;
	modified_date: string;
	is_closed: boolean;
	tags: [string, string | null][];
}

export interface Milestone {
	id: number;
	name: string;
	slug: string;
	project: number;
	estimated_start: string;
	estimated_finish: string;
	created_date: string;
	modified_date: string;
	closed: boolean;
	total_points: number;
	closed_points: number;
	user_stories: UserStory[];
}

export interface HistoryEntry {
	id: string;
	user: {
		pk: number;
		username: string;
		name: string;
		photo: string | null;
		is_active: boolean;
	};
	created_at: string;
	comment: string;
	comment_html: string;
delete_comment_date: string | null;
delete_comment_user: object | null;
edit_comment_date?: string | null;
type: number;
values_diff: Record<string, unknown>;
}

export interface AuthResponse {
	id: number;
	username: string;
	full_name: string;
	full_name_display?: string;
	email: string;
	photo?: string | null;
	color?: string;
	auth_token: string;
	refresh: string;
}

export interface Membership {
	id: number;
	user: number;
	project: number;
	role: number;
	role_name: string;
	full_name: string;
	email: string;
	color: string;
	photo: string | null;
	is_admin: boolean;
	is_active: boolean;
	is_owner: boolean;
}

// AT Protocol / Bluesky OAuth types
export interface AtprotoAuthorizeResponse {
	url?: string;
	auth_token?: string;
	refresh?: string;
}

export interface AtprotoSession {
	accessToken: string;
	refreshToken?: string;
	handle: string;
}

// Project settings / admin surface (Taiga REST API)

export interface ProjectModules {
	github?: { secret?: string | null; webhooks_url?: string | null };
	gitlab?: { secret?: string | null; webhooks_url?: string | null; valid_origin_ips?: string[] };
	bitbucket?: { secret?: string | null; webhooks_url?: string | null; valid_origin_ips?: string[] };
	gogs?: { secret?: string | null; webhooks_url?: string | null };
}

export interface Webhook {
	id: number;
	project: number;
	name: string;
	url: string;
	key: string;
	logs_counter: number;
}

export interface WebhookLog {
	id: number;
	webhook: number;
	url: string;
	created: string;
	status: number;
	duration: number;
	request_headers: Record<string, string>;
	request_data: unknown;
	response_headers: Record<string, string>;
	response_data: string;
}

export interface NotifyPolicy {
	id: number;
	project: number;
	project_name: string;
	notify_level: number;
	live_notify_level?: number | null;
	web_notify_level?: boolean | null;
}

export interface ProjectTemplate {
	id: number;
	name: string;
	slug: string;
	description: string;
	default_owner_role?: string;
	created_date?: string;
	modified_date?: string;
}

export interface ExportAccepted {
	export_id: string;
}

export interface ExportSynch {
	url: string;
}

/** GET /projects/{id}/issues_stats — one binned count (id → {color, count, id, name}). */
export interface IssueStatBin {
	color: string;
	count: number;
	id: number;
	name: string;
}

/** GET /projects/{id}/issues_stats — per-user counts (assignees/owners). */
export interface IssueStatUser extends IssueStatBin {
	username: string;
}

/** GET /projects/{id}/issues_stats — one series of the 28-day activity window. */
export interface IssueStatTrend {
	color: string;
	data: number[];
	id: number;
	name: string;
}

/** GET /projects/{id}/issues_stats — issue analytics. */
export interface ProjectIssueStats {
	total_issues: number;
	opened_issues: number;
	closed_issues: number;
	issues_per_assigned_to: Record<string, IssueStatUser>;
	issues_per_owner: Record<string, IssueStatUser>;
	issues_per_priority: Record<string, IssueStatBin>;
	issues_per_severity: Record<string, IssueStatBin>;
	issues_per_status: Record<string, IssueStatBin>;
	issues_per_type: Record<string, IssueStatBin>;
	last_four_weeks_days: {
		by_open_closed: {
			closed: number[];
			open: number[];
		};
		by_priority: Record<string, IssueStatTrend>;
		by_severity: Record<string, IssueStatTrend>;
		by_status: Record<string, IssueStatTrend>;
	};
}

/** GET /milestones/{id}/stats — one day of the sprint burndown. */
export interface MilestoneStatDay {
	day: string;
	name: number;
	open_points: number;
	optimal_points: number;
}

/** GET /milestones/{id}/stats — sprint burndown and completion. */
export interface MilestoneStats {
	completed_points: number[];
	completed_tasks: number;
	completed_userstories: number;
	days: MilestoneStatDay[];
	estimated_finish: string;
	estimated_start: string;
	iocaine_doses: number;
	name: string;
	total_points: Record<string, number>;
	total_tasks: number;
	total_userstories: number;
}

/** GET /users/{id}/stats — user roll-up. */
export interface UserStats {
	roles: string[];
	total_num_closed_userstories: number;
	total_num_contacts: number;
	total_num_projects: number;
}