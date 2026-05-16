import { api } from './client';
import type { UserStory, UserStoryStatus } from './types';

export async function getUserStories(projectId: number, limit: number = 100): Promise<UserStory[]> {
	return api.get<UserStory[]>('/userstories', {
		project: projectId,
		page_size: limit,
		order_by: '-modified_date'
	});
}

export async function getUserStory(id: number): Promise<UserStory> {
	return api.get<UserStory>(`/userstories/${id}`);
}

export async function updateUserStory(id: number, data: Partial<UserStory>): Promise<UserStory> {
	return api.patch<UserStory>(`/userstories/${id}`, data);
}

export async function getUserStoryStatuses(projectId: number): Promise<UserStoryStatus[]> {
	return api.get<UserStoryStatus[]>('/userstory-statuses', { project: projectId });
}

export async function createUserStoryStatus(data: {
	project: number;
	name: string;
	color?: string;
	order?: number;
}): Promise<UserStoryStatus> {
	return api.post<UserStoryStatus>('/userstory-statuses', data);
}

export async function updateUserStoryStatus(id: number, data: {
	name?: string;
	color?: string;
	order?: number;
	is_closed?: boolean;
}, version: number): Promise<UserStoryStatus> {
	return api.patch<UserStoryStatus>(`/userstory-statuses/${id}`, { ...data, version });
}

export async function deleteUserStoryStatus(id: number): Promise<void> {
	return api.delete(`/userstory-statuses/${id}`);
}

export async function createUserStory(data: {
	project: number;
	subject: string;
	status?: number;
	description?: string;
}): Promise<UserStory> {
	return api.post<UserStory>('/userstories', data);
}
