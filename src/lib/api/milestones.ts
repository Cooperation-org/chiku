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

/**
 * Create a sprint (Taiga milestone). Dates are `YYYY-MM-DD`.
 * Frontend-only Scrum support — no backend change needed.
 */
export async function createMilestone(data: {
	project: number;
	name: string;
	estimated_start: string;
	estimated_finish: string;
}): Promise<Milestone> {
	return api.post<Milestone>('/milestones', data);
}

/** Close a sprint. Unfinished stories must be rolled over first (see queries). */
export async function closeMilestone(id: number): Promise<Milestone> {
	return api.patch<Milestone>(`/milestones/${id}`, { closed: true });
}

/** Reopen a closed sprint. */
export async function reopenMilestone(id: number): Promise<Milestone> {
	return api.patch<Milestone>(`/milestones/${id}`, { closed: false });
}

/**
 * Delete a sprint. Stories must be moved out first (see queries) — the
 * backend must never be left to decide what happens to them.
 */
export async function deleteMilestone(id: number): Promise<void> {
	await api.delete(`/milestones/${id}`);
}
