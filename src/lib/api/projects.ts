import { api } from './client';
import type { Project } from './types';

export interface CreateProjectData {
	name: string;
	description: string;
	creation_template?: number;
	is_private?: boolean;
}

export async function getProjects(): Promise<Project[]> {
	return api.get<Project[]>('/projects', { page_size: 1000, order_by: 'user_order' });
}

export async function reorderProjects(order: { project_id: number; order: number }[]): Promise<void> {
	await api.post('/projects/bulk_update_order', order);
}

export async function getProject(projectId: number): Promise<Project> {
	return api.get<Project>(`/projects/${projectId}`);
}

export async function getProjectBySlug(slug: string): Promise<Project> {
	const projects = await api.get<Project[]>('/projects', { slug });
	if (projects.length === 0) {
		throw new Error(`Project not found: ${slug}`);
	}
	return projects[0];
}

export async function createProject(data: CreateProjectData): Promise<Project> {
	return api.post<Project>('/projects', {
		name: data.name,
		description: data.description || data.name,
		creation_template: data.creation_template || 2, // Default to Kanban
		is_private: data.is_private ?? false
	});
}

export async function updateProject(projectId: number, data: Partial<Project>): Promise<Project> {
	return api.patch<Project>(`/projects/${projectId}`, data);
}

export async function addProjectTag(projectId: number, tag: string, color?: string): Promise<void> {
	await api.post(`/projects/${projectId}/create_tag`, { tag, color: color || null });
}

export async function deleteProjectTag(projectId: number, tag: string): Promise<void> {
	await api.post(`/projects/${projectId}/delete_tag`, { tag });
}

export function isArchived(project: Project): boolean {
	return project.tags?.some(tag => tag.toLowerCase() === 'archived') ?? false;
}

export async function archiveProject(project: Project): Promise<Project> {
	// First ensure the archived tag exists in tags_colors (ignore error if already exists)
	if (!project.tags_colors?.archived) {
		try {
			await addProjectTag(project.id, 'archived', '#888888');
		} catch {
			// Tag may already exist in tags_colors, that's fine
		}
	}
	// Add archived to project tags
	const newTags = [...(project.tags || [])];
	if (!newTags.some(t => t.toLowerCase() === 'archived')) {
		newTags.push('archived');
	}
	return updateProject(project.id, { tags: newTags });
}

export async function unarchiveProject(project: Project): Promise<Project> {
	// Remove archived from project tags
	const newTags = (project.tags || []).filter(t => t.toLowerCase() !== 'archived');
	return updateProject(project.id, { tags: newTags });
}

export async function deleteProject(projectId: number): Promise<void> {
	await api.delete(`/projects/${projectId}`);
}
