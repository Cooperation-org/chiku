import { api } from './client';
import type { Task, TaskStatus } from './types';

export async function getTasks(projectId: number, userStoryId?: number): Promise<Task[]> {
	const params: Record<string, string | number | boolean | undefined> = {
		project: projectId,
		page_size: 500,
		order_by: '-modified_date'
	};
	if (userStoryId) {
		params.user_story = userStoryId;
	}
	return api.get<Task[]>('/tasks', params);
}

export async function getTask(id: number): Promise<Task> {
	return api.get<Task>(`/tasks/${id}`);
}

export async function createTask(data: {
	project: number;
	subject: string;
	user_story?: number;
	status?: number;
	assigned_to?: number | null;
	description?: string;
}): Promise<Task> {
	return api.post<Task>('/tasks', data);
}

export async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
	return api.patch<Task>(`/tasks/${id}`, data);
}

export async function deleteTask(id: number): Promise<void> {
	return api.delete(`/tasks/${id}`);
}

export async function getTaskStatuses(projectId: number): Promise<TaskStatus[]> {
	return api.get<TaskStatus[]>('/task-statuses', { project: projectId });
}