import { api } from './client';

/**
 * Taiga's search endpoint. `project` is required by the API — results are
 * scoped to one project.
 */
export interface SearchResults {
	count: number;
	userstories: { id: number; ref: number; subject: string; status: number; assigned_to: number | null }[];
	epics: { id: number; ref: number; subject: string; status: number; assigned_to: number | null }[];
	tasks: { id: number; ref: number; subject: string; status: number; assigned_to: number | null }[];
	issues: { id: number; ref: number; subject: string; status: number; assigned_to: number | null }[];
	wiki_pages?: unknown[];
}

export async function searchProject(projectId: number, text: string): Promise<SearchResults> {
	return api.get<SearchResults>('/search', { project: projectId, text });
}
