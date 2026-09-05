import { api } from './client';
import type { Epic } from './types';

export async function getEpics(projectId: number): Promise<Epic[]> {
	return api.get<Epic[]>('/epics', { project: projectId });
}

export async function getEpic(id: number): Promise<Epic> {
	return api.get<Epic>(`/epics/${id}`);
}

export async function updateEpic(id: number, data: Partial<Epic>): Promise<Epic> {
	return api.patch<Epic>(`/epics/${id}`, data);
}

export async function createEpic(data: {
	project: number;
	subject: string;
	color?: string;
	description?: string;
}): Promise<Epic> {
	return api.post<Epic>('/epics', data);
}
