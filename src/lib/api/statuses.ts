import { api } from './client';
import type { UserStoryStatus } from './types';

export async function getStatuses(projectId: number): Promise<UserStoryStatus[]> {
	return api.get<UserStoryStatus[]>('/userstory-statuses', { project: projectId });
}

export async function createStatus(data: {
	project: number;
	name: string;
	color?: string;
	is_closed?: boolean;
	order?: number;
}): Promise<UserStoryStatus> {
	return api.post<UserStoryStatus>('/userstory-statuses', data);
}

export async function updateStatus(
	id: number,
	data: Partial<Pick<UserStoryStatus, 'name' | 'color' | 'order' | 'is_closed'>>
): Promise<UserStoryStatus> {
	return api.patch<UserStoryStatus>(`/userstory-statuses/${id}`, data);
}

export async function deleteStatus(id: number, moveTo: number): Promise<void> {
	await api.delete(`/userstory-statuses/${id}?moveTo=${moveTo}`);
}

export async function bulkUpdateStatusOrder(
	projectId: number,
	statuses: Array<[number, number]>
): Promise<void> {
	await api.post('/userstory-statuses/bulk_update_order', {
		project: projectId,
		bulk_userstory_statuses: statuses
	});
}
