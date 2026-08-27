import { api } from './client';
import type { User } from './types';

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
