import { describe, it, expect } from 'vitest';
import { isArchived } from '../projects';
import type { Project } from '../types';

// Mock project factory
function createMockProject(overrides: Partial<Project> = {}): Project {
	return {
		id: 1,
		name: 'Test Project',
		slug: 'test-project',
		description: 'A test project',
		created_date: '2024-01-01T00:00:00Z',
		modified_date: '2024-01-01T00:00:00Z',
		owner: {
			id: 1,
			username: 'testuser',
			full_name: 'Test User',
			full_name_display: 'Test User',
			email: 'test@example.com',
			photo: null,
			big_photo: null,
			color: '#000000'
		},
		members: [1],
		is_private: false,
		total_milestones: 0,
		total_story_points: 0,
		is_kanban_activated: true,
		is_backlog_activated: true,
		is_epics_activated: true,
		is_issues_activated: true,
		is_wiki_activated: true,
		us_statuses: [],
		task_statuses: [],
		points: [],
		tags: [],
		tags_colors: {},
		...overrides
	};
}

describe('isArchived', () => {
	it('returns false for project with no tags', () => {
		const project = createMockProject({ tags: [] });
		expect(isArchived(project)).toBe(false);
	});

	it('returns false for project with undefined tags', () => {
		const project = createMockProject();
		// @ts-ignore - testing undefined case
		project.tags = undefined;
		expect(isArchived(project)).toBe(false);
	});

	it('returns false for project with other tags but not archived', () => {
		const project = createMockProject({
			tags: ['important', 'feature']
		});
		expect(isArchived(project)).toBe(false);
	});

	it('returns true for project with archived tag', () => {
		const project = createMockProject({
			tags: ['archived']
		});
		expect(isArchived(project)).toBe(true);
	});

	it('returns true for project with archived tag (case insensitive)', () => {
		const project = createMockProject({
			tags: ['ARCHIVED']
		});
		expect(isArchived(project)).toBe(true);
	});

	it('returns true for project with archived tag among other tags', () => {
		const project = createMockProject({
			tags: ['important', 'archived', 'legacy']
		});
		expect(isArchived(project)).toBe(true);
	});
});
