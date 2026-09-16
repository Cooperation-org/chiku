import { api, ApiError } from './client';
import type { User, UserStats } from './types';

/** Taiga's own limit on full_name. */
export const MAX_DISPLAY_NAME = 36;

export interface Me extends User {
	full_name_display: string;
	bio: string;
}

export async function getMe(): Promise<Me> {
	return api.get<Me>('/users/me');
}

/**
 * Change what other people see. `full_name` is what every avatar's letters and
 * every name label are drawn from, so this is how someone stops being a bare "J".
 */
export async function updateMe(userId: number, data: { full_name?: string; color?: string }): Promise<Me> {
	return api.patch<Me>(`/users/${userId}`, data);
}

export async function changeAvatar(file: File): Promise<Me> {
	const form = new FormData();
	form.append('avatar', file);
	return api.postForm<Me>('/users/change_avatar', form);
}

export async function removeAvatar(): Promise<Me> {
	return api.post<Me>('/users/remove_avatar');
}

/**
 * Public profile fields (UserSerializer — what any authenticated user may
 * see about someone else; the admin serializer's email/uuid/etc. only apply
 * to self/superuser and are deliberately absent here).
 */
export interface MemberProfile {
	id: number;
	username: string;
	full_name: string;
	full_name_display: string;
	color: string;
	bio: string;
	is_active: boolean;
	photo: string | null;
	big_photo: string | null;
	gravatar_id: string;
	roles: string[];
	/** Present when extra info attaches; hidden profiles stay viewable but flagged. */
	is_profile_visible?: boolean;
}

/** Resolve a member by exact @mention text. Null when unknown or not visible. */
export async function getUserByUsername(username: string): Promise<MemberProfile | null> {
	const clean = username.trim().replace(/^@/, '');
	if (!clean) return null;
	try {
		return await api.get<MemberProfile>('/users/by_username', { username: clean });
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) return null;
		throw err;
	}
}

export async function getUserStats(userId: number): Promise<UserStats> {
	return api.get<UserStats>(`/users/${userId}/stats`);
}

/** Member profile route for a project. Usernames are URL-safe in Taiga. */
export function memberPath(projectSlug: string, username: string): string {
	return `/projects/${projectSlug}/members/${username}`;
}
