// Taiga API types

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
	us_statuses: UserStoryStatus[];
	task_statuses: TaskStatus[];
	points: Point[];
	roles: Role[];
	tags: string[];
	tags_colors: Record<string, string>;
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
}

/** Taiga attachment (userstories/tasks/issues share this shape). */
export interface Attachment {
	id: number;
	project: number;
	/** User id of whoever uploaded it — resolve against project members for a name. */
	owner: number;
	name: string;
	/** Storage-relative path. Use `url` to fetch; it carries the access token. */
	attached_file: string;
	size: number;
	/** Signed, absolute media URL — usable directly as href/src without an auth header. */
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
	type: number;
	values_diff: Record<string, unknown>;
}

export interface AuthResponse {
	id: number;
	username: string;
	full_name: string;
	email: string;
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
