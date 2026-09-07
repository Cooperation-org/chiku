import { api } from './client';
import type { MilestoneStats, ProjectIssueStats, UserStats } from './types';

export async function getProjectIssueStats(projectId: number): Promise<ProjectIssueStats> {
	return api.get<ProjectIssueStats>(`/projects/${projectId}/issues_stats`);
}

export async function getMilestoneStats(milestoneId: number): Promise<MilestoneStats> {
	return api.get<MilestoneStats>(`/milestones/${milestoneId}/stats`);
}

export async function getUserStats(userId: number): Promise<UserStats> {
	return api.get<UserStats>(`/users/${userId}/stats`);
}
