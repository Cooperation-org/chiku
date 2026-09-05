import { api } from './client';
import type { Milestone } from './types';

export async function getMilestones(projectId: number): Promise<Milestone[]> {
	return api.get<Milestone[]>('/milestones', { project: projectId });
}

export async function getMilestone(id: number): Promise<Milestone> {
	return api.get<Milestone>(`/milestones/${id}`);
}

export async function updateMilestone(id: number, data: Partial<Milestone>): Promise<Milestone> {
	return api.patch<Milestone>(`/milestones/${id}`, data);
}
