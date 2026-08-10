// Story search + filtering, shared by any view that lists user stories.
// Pure functions over an already-loaded story array: no API calls, no stores.

import type { UserStory } from '$lib/api/types';

/** Sentinel assignee value meaning "no one is assigned". */
export const UNASSIGNED = -1;

export interface StoryFilter {
	/** Free text; multiple words must all match (AND). */
	q: string;
	/** User id, UNASSIGNED, or null for any. */
	assignee: number | null;
	/** Story creator (Taiga `owner`), or null for any. */
	creator: number | null;
	project: number | null;
	/** Status name, not id — status ids differ per project. */
	status: string;
	/** Story must carry every tag listed. */
	tags: string[];
	/** Inclusive due-date bounds, YYYY-MM-DD. A bound excludes stories with no due date. */
	dueFrom: string;
	dueTo: string;
	showClosed: boolean;
}

export const EMPTY_FILTER: StoryFilter = {
	q: '',
	assignee: null,
	creator: null,
	project: null,
	status: '',
	tags: [],
	dueFrom: '',
	dueTo: '',
	showClosed: false
};

/** Taiga tags arrive as [name, colour] pairs. */
export function tagNames(story: UserStory): string[] {
	return (story.tags || []).map(t => (Array.isArray(t) ? t[0] : t)).filter(Boolean);
}

function personName(u: { full_name_display?: string; full_name?: string; username?: string } | null): string {
	if (!u) return '';
	return [u.full_name_display, u.full_name, u.username].filter(Boolean).join(' ');
}

/** Everything a free-text query is matched against, lowercased. */
function haystack(story: UserStory): string {
	return [
		`#${story.ref}`,
		story.subject,
		story.description,
		story.project_extra_info?.name,
		story.status_extra_info?.name,
		personName(story.assigned_to_extra_info),
		personName(story.owner_extra_info),
		...tagNames(story)
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

export function matchesQuery(story: UserStory, q: string): boolean {
	const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return true;
	const text = haystack(story);
	// A leading # is how people type a ref; don't make it a required character.
	return terms.every(term => text.includes(term.replace(/^#/, '')));
}

export function matchesFilter(story: UserStory, f: StoryFilter): boolean {
	if (!f.showClosed && story.is_closed) return false;

	if (f.assignee != null) {
		if (f.assignee === UNASSIGNED) {
			if (story.assigned_to != null) return false;
		} else if (story.assigned_to !== f.assignee) return false;
	}

	if (f.creator != null && story.owner !== f.creator) return false;
	if (f.project != null && story.project !== f.project) return false;
	if (f.status && story.status_extra_info?.name !== f.status) return false;

	if (f.tags.length > 0) {
		const have = new Set(tagNames(story).map(t => t.toLowerCase()));
		if (!f.tags.every(t => have.has(t.toLowerCase()))) return false;
	}

	if (f.dueFrom || f.dueTo) {
		if (!story.due_date) return false;
		// Taiga due dates are plain YYYY-MM-DD, so string compare is date compare.
		if (f.dueFrom && story.due_date < f.dueFrom) return false;
		if (f.dueTo && story.due_date > f.dueTo) return false;
	}

	return matchesQuery(story, f.q);
}

export function filterStories(stories: UserStory[], f: StoryFilter): UserStory[] {
	return stories.filter(s => matchesFilter(s, f));
}

/** True when the filter would hide nothing except closed stories. */
export function isEmptyFilter(f: StoryFilter): boolean {
	return (
		!f.q.trim() &&
		f.assignee == null &&
		f.creator == null &&
		f.project == null &&
		!f.status &&
		f.tags.length === 0 &&
		!f.dueFrom &&
		!f.dueTo
	);
}

/** Every tag present in the given stories, sorted, deduped case-insensitively. */
export function collectTags(stories: UserStory[]): string[] {
	const seen = new Map<string, string>();
	for (const s of stories) {
		for (const t of tagNames(s)) {
			if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
		}
	}
	return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Every status name present, in the order stories first mention them. */
export function collectStatuses(stories: UserStory[]): string[] {
	const seen = new Set<string>();
	for (const s of stories) {
		const name = s.status_extra_info?.name;
		if (name) seen.add(name);
	}
	return [...seen].sort((a, b) => a.localeCompare(b));
}

export interface PersonOption {
	id: number;
	name: string;
}

/** People who appear as assignee or creator, for the filter dropdowns. */
export function collectPeople(stories: UserStory[]): { assignees: PersonOption[]; creators: PersonOption[] } {
	const assignees = new Map<number, string>();
	const creators = new Map<number, string>();
	for (const s of stories) {
		if (s.assigned_to != null && s.assigned_to_extra_info) {
			assignees.set(s.assigned_to, personNameShort(s.assigned_to_extra_info));
		}
		if (s.owner_extra_info) {
			creators.set(s.owner, personNameShort(s.owner_extra_info));
		}
	}
	const sort = (m: Map<number, string>) =>
		[...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
	return { assignees: sort(assignees), creators: sort(creators) };
}

function personNameShort(u: { full_name_display?: string; full_name?: string; username?: string }): string {
	return u.full_name_display || u.full_name || u.username || 'Unknown';
}

// --- URL round-trip: a filtered view has to be linkable ---------------------

export function filterToParams(f: StoryFilter): URLSearchParams {
	const p = new URLSearchParams();
	if (f.q.trim()) p.set('q', f.q.trim());
	if (f.assignee != null) p.set('assignee', String(f.assignee));
	if (f.creator != null) p.set('creator', String(f.creator));
	if (f.project != null) p.set('project', String(f.project));
	if (f.status) p.set('status', f.status);
	if (f.tags.length) p.set('tags', f.tags.join(','));
	if (f.dueFrom) p.set('from', f.dueFrom);
	if (f.dueTo) p.set('to', f.dueTo);
	if (f.showClosed) p.set('closed', '1');
	return p;
}

function num(v: string | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export function filterFromParams(p: URLSearchParams): StoryFilter {
	return {
		q: p.get('q') || '',
		assignee: num(p.get('assignee')),
		creator: num(p.get('creator')),
		project: num(p.get('project')),
		status: p.get('status') || '',
		tags: (p.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean),
		dueFrom: p.get('from') || '',
		dueTo: p.get('to') || '',
		showClosed: p.get('closed') === '1'
	};
}

/** True when the URL carries no filter state at all (so a default may be applied). */
export function paramsHaveFilter(p: URLSearchParams): boolean {
	return ['q', 'assignee', 'creator', 'project', 'status', 'tags', 'from', 'to', 'closed'].some(k => p.has(k));
}
