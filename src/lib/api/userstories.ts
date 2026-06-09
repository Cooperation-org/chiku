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

export async function getAllUserStories(params: Record<string, unknown> = {}): Promise<UserStory[]> {
	return api.get<UserStory[]>('/userstories', {
		page_size: 200,
		order_by: '-modified_date',
		...params
	});
}

export async function moveUserStory(storyId: number, targetProjectId: number, targetStatus: number, version: number): Promise<UserStory> {
	return api.patch<UserStory>(`/userstories/${storyId}`, {
		project: targetProjectId,
		status: targetStatus,
		version
	});
}

export async function createUserStory(data: {
	project: number;
	subject: string;
	status?: number;
	description?: string;
}): Promise<UserStory> {
	return api.post<UserStory>('/userstories', data);
}
