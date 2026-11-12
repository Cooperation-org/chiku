import { api, ApiError } from './client';
import type { UserStory, UserStoryStatus } from './types';

export async function getUserStories(projectId: number, limit: number = 100): Promise<UserStory[]> {
	return api.get<UserStory[]>('/userstories', {
		project: projectId,
		page_size: limit,
		order_by: '-modified_date'
	});
}

export async function getUserStory(id: number): Promise<UserStory> {
	return api.get<UserStory>(`/userstories/${id}`);
}

export async function updateUserStory(id: number, data: Partial<UserStory>): Promise<UserStory> {
	return api.patch<UserStory>(`/userstories/${id}`, data);
}

export async function getUserStoryStatuses(projectId: number): Promise<UserStoryStatus[]> {
	return api.get<UserStoryStatus[]>('/userstory-statuses', { project: projectId });
}

export async function getAllUserStories(params: Record<string, unknown> = {}): Promise<UserStory[]> {
	return api.get<UserStory[]>('/userstories', {
		page_size: 200,
		order_by: '-modified_date',
		...params
	});
}

const PAGE_SIZE = 200;
/** Stop after this many pages so a runaway project can't hang the browser. */
const MAX_PAGES = 25;

/**
 * Every story the caller can see, following Taiga's pagination.
 * Searching a single page would quietly miss stories, so views that filter
 * client-side use this instead of `getAllUserStories`.
 * `complete` is false when MAX_PAGES was hit and more stories remain.
 */
export async function getAllUserStoriesPaged(
	params: Record<string, unknown> = {}
): Promise<{ stories: UserStory[]; complete: boolean }> {
	const stories: UserStory[] = [];
	for (let page = 1; page <= MAX_PAGES; page++) {
		const batch = await api.get<UserStory[]>('/userstories', {
			page_size: PAGE_SIZE,
			page,
			order_by: '-modified_date',
			...(params as Record<string, string | number | boolean | undefined>)
		});
		if (!batch?.length) return { stories, complete: true };
		stories.push(...batch);
		if (batch.length < PAGE_SIZE) return { stories, complete: true };
	}
	return { stories, complete: false };
}

/**
 * Taiga guards every story write with an optimistic-concurrency check: the
 * `version` sent must be the story's current one, or an older one that did not
 * touch the same fields. It answers a mismatch with
 * `400 {"version": "The version parameter is not valid"}` (or
 * `"The version doesn't match with the current one"`).
 */
function isVersionConflict(error: unknown): boolean {
	return error instanceof ApiError && error.status === 400 && 'version' in error.body;
}

/**
 * Set a story's status, surviving a version we no longer hold.
 *
 * The board caches each story's version from page load, so anything that has
 * touched the story since — another drag, the detail view, a teammate, amebo —
 * makes that number stale and Taiga rejects the move. Dropping a card is an
 * explicit "put it in this column", so re-read the current version and send the
 * move once more rather than failing in the user's face.
 */
export async function setUserStoryStatus(
	storyId: number,
	statusId: number,
	version: number
): Promise<UserStory> {
	try {
		return await api.patch<UserStory>(`/userstories/${storyId}`, { status: statusId, version });
	} catch (error) {
		if (!isVersionConflict(error)) throw error;
		const current = await getUserStory(storyId);
		return api.patch<UserStory>(`/userstories/${storyId}`, {
			status: statusId,
			version: current.version
		});
	}
}

/** What Taiga answers for each story whose kanban_order it rewrote. */
export interface KanbanOrderUpdate {
	id: number;
	status: number;
	swimlane: number | null;
	kanban_order: number;
}

/**
 * Put a story at a position in its board column, saved in Taiga's
 * `kanban_order`. The position is given by a neighbour: the card now above it
 * (`afterId`) or, when it went to the top, the card now below it (`beforeId`).
 * Taiga renumbers whatever else in the column has to shift and returns every
 * story it changed. It does not bump `version`.
 */
export async function setKanbanPosition(
	projectId: number,
	statusId: number,
	storyId: number,
	neighbour: { afterId?: number; beforeId?: number }
): Promise<KanbanOrderUpdate[]> {
	return api.post<KanbanOrderUpdate[]>('/userstories/bulk_update_kanban_order', {
		project_id: projectId,
		status_id: statusId,
		bulk_userstories: [storyId],
		...(neighbour.afterId !== undefined
			? { after_userstory_id: neighbour.afterId }
			: neighbour.beforeId !== undefined
				? { before_userstory_id: neighbour.beforeId }
				: {})
	});
}

export async function moveUserStory(storyId: number, targetProjectId: number, targetStatus: number, version: number): Promise<UserStory> {
	return api.patch<UserStory>(`/userstories/${storyId}`, {
		project: targetProjectId,
		status: targetStatus,
		version
	});
}

export async function createUserStory(data: {
	project: number;
	subject: string;
	status?: number;
	description?: string;
	assigned_to?: number | null;
}): Promise<UserStory> {
	return api.post<UserStory>('/userstories', data);
}
