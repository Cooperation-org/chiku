import { describe, it, expect } from 'vitest';
import {
	EMPTY_FILTER,
	UNASSIGNED,
	collectStatuses,
	collectTags,
	filterFromParams,
	filterStories,
	filterToParams,
	isEmptyFilter,
	matchesQuery,
	paramsHaveFilter
} from '../stories';
import type { UserStory } from '$lib/api/types';

function story(over: Partial<UserStory> = {}): UserStory {
	return {
		id: 1,
		ref: 30,
		subject: 'add search and filtering to tasks dashboard',
		description: 'server-side and client-side text search',
		status: 1,
		status_extra_info: { name: 'New', color: '#999', is_closed: false },
		assigned_to: 7,
		assigned_to_extra_info: { full_name_display: 'Alex Alkhateeb', username: 'alkhateeb_alex' },
		owner: 7,
		owner_extra_info: { full_name_display: 'Alex Alkhateeb', username: 'alkhateeb_alex' },
		project: 2,
		project_extra_info: { id: 2, name: 'VC', slug: 'vc' },
		is_closed: false,
		due_date: '2026-08-20',
		tags: [['marten', '#fff'], ['ux', null]],
		...over
	} as unknown as UserStory;
}

const base = { ...EMPTY_FILTER };

describe('matchesQuery', () => {
	const s = story();

	it('is true for an empty query', () => expect(matchesQuery(s, '   ')).toBe(true));
	it('matches the subject case-insensitively', () => expect(matchesQuery(s, 'SEARCH')).toBe(true));
	it('matches the description', () => expect(matchesQuery(s, 'client-side')).toBe(true));
	it('matches a tag', () => expect(matchesQuery(s, 'marten')).toBe(true));
	it('matches a person', () => expect(matchesQuery(s, 'alkhateeb')).toBe(true));
	it('matches the project name', () => expect(matchesQuery(s, 'vc')).toBe(true));
	it('matches a ref with or without #', () => {
		expect(matchesQuery(s, '#30')).toBe(true);
		expect(matchesQuery(s, '30')).toBe(true);
	});
	it('requires every term', () => {
		expect(matchesQuery(s, 'search dashboard')).toBe(true);
		expect(matchesQuery(s, 'search velocity')).toBe(false);
	});
	it('survives missing optional fields', () => {
		const bare = story({ description: undefined, tags: undefined, assigned_to_extra_info: null } as Partial<UserStory>);
		expect(matchesQuery(bare, 'dashboard')).toBe(true);
	});
});

describe('filterStories', () => {
	it('hides closed stories unless asked', () => {
		const stories = [story(), story({ id: 2, is_closed: true })];
		expect(filterStories(stories, base)).toHaveLength(1);
		expect(filterStories(stories, { ...base, showClosed: true })).toHaveLength(2);
	});

	it('filters by assignee, including unassigned', () => {
		const stories = [story(), story({ id: 2, assigned_to: null, assigned_to_extra_info: null })];
		expect(filterStories(stories, { ...base, assignee: 7 })).toHaveLength(1);
		expect(filterStories(stories, { ...base, assignee: UNASSIGNED })).toHaveLength(1);
		expect(filterStories(stories, { ...base, assignee: UNASSIGNED })[0].id).toBe(2);
	});

	it('filters by creator separately from assignee', () => {
		const stories = [story(), story({ id: 2, owner: 9 })];
		expect(filterStories(stories, { ...base, creator: 9 })).toHaveLength(1);
	});

	it('filters by status name across projects', () => {
		const stories = [
			story(),
			story({ id: 2, project: 3, status: 88, status_extra_info: { name: 'New', color: '#111', is_closed: false } })
		];
		expect(filterStories(stories, { ...base, status: 'New' })).toHaveLength(2);
		expect(filterStories(stories, { ...base, status: 'Done' })).toHaveLength(0);
	});

	it('requires all selected tags', () => {
		const stories = [story(), story({ id: 2, tags: [['marten', null]] })];
		expect(filterStories(stories, { ...base, tags: ['marten'] })).toHaveLength(2);
		expect(filterStories(stories, { ...base, tags: ['marten', 'ux'] })).toHaveLength(1);
	});

	it('filters by an inclusive due-date range and drops undated stories', () => {
		const stories = [story(), story({ id: 2, due_date: '2026-09-01' }), story({ id: 3, due_date: null })];
		expect(filterStories(stories, { ...base, dueFrom: '2026-08-20', dueTo: '2026-08-20' }).map(s => s.id)).toEqual([1]);
		expect(filterStories(stories, { ...base, dueFrom: '2026-08-21' }).map(s => s.id)).toEqual([2]);
		expect(filterStories(stories, { ...base, dueTo: '2026-12-31' }).map(s => s.id)).toEqual([1, 2]);
	});

	it('combines text search with the other filters', () => {
		const stories = [story(), story({ id: 2, subject: 'velocity chart', assigned_to: 9 })];
		expect(filterStories(stories, { ...base, q: 'velocity', assignee: 7 })).toHaveLength(0);
		expect(filterStories(stories, { ...base, q: 'velocity', assignee: 9 })).toHaveLength(1);
	});
});

describe('collectors', () => {
	it('dedupes tags case-insensitively and sorts them', () => {
		expect(collectTags([story(), story({ id: 2, tags: [['UX', null], ['api', null]] })])).toEqual([
			'api',
			'marten',
			'ux'
		]);
	});

	it('lists distinct status names', () => {
		const other = story({ id: 2, status_extra_info: { name: 'Done', color: '#0f0', is_closed: true } });
		expect(collectStatuses([story(), other])).toEqual(['Done', 'New']);
	});
});

describe('url round-trip', () => {
	it('omits defaults', () => {
		expect(filterToParams(base).toString()).toBe('');
		expect(paramsHaveFilter(new URLSearchParams(''))).toBe(false);
		expect(isEmptyFilter(base)).toBe(true);
	});

	it('restores every field', () => {
		const f = {
			q: 'search',
			assignee: 7,
			creator: 9,
			project: 2,
			status: 'In progress',
			tags: ['marten', 'ux'],
			dueFrom: '2026-08-01',
			dueTo: '2026-08-31',
			showClosed: true
		};
		const restored = filterFromParams(new URLSearchParams(filterToParams(f).toString()));
		expect(restored).toEqual(f);
		expect(paramsHaveFilter(filterToParams(f))).toBe(true);
	});

	it('treats an unassigned filter as real state', () => {
		const p = filterToParams({ ...base, assignee: UNASSIGNED });
		expect(filterFromParams(p).assignee).toBe(UNASSIGNED);
	});
});
