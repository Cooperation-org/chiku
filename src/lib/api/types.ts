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
	us_statuses: UserStoryStatus[];
	task_statuses: TaskStatus[];
	points: Point[];
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
	version: number;
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
	total_points: number | null;
	kanban_order: number;
	backlog_order: number;
	sprint_order: number;
	created_date: string;
	modified_date: string;
	tags: [string, string | null][];
	epics: EpicRef[] | null;
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

