import { api } from './client';

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

export interface Role {
	id: number;
	name: string;
	slug: string;
	order: number;
	project: number;
	permissions: string[];
}

export async function getProjectMemberships(projectId: number): Promise<Membership[]> {
	return api.get<Membership[]>('/memberships', { project: projectId });
}

export async function getProjectRoles(projectId: number): Promise<Role[]> {
	return api.get<Role[]>('/roles', { project: projectId });
}

export async function getAllUsers(): Promise<{ id: number; username: string; full_name: string }[]> {
	return api.get('/users', { page_size: 1000 });
}

export async function searchUsers(query: string): Promise<{ id: number; username: string; full_name: string }[]> {
	return api.get('/users', { q: query, page_size: 10 });
}

export async function addMembership(projectId: number, username: string, roleId: number): Promise<Membership> {
	return api.post<Membership>('/memberships', {
		project: projectId,
		username: username,
		role: roleId
	});
}

export async function removeMembership(membershipId: number): Promise<void> {
	return api.delete(`/memberships/${membershipId}`);
}
