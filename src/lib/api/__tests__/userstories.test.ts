import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../client';

const patch = vi.fn();
const get = vi.fn();
const post = vi.fn();

vi.mock('../client', async () => {
	const actual = await vi.importActual<typeof import('../client')>('../client');
	return { ...actual, api: { patch: (...a: unknown[]) => patch(...a), get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } };
});

const { setUserStoryStatus, setKanbanPosition } = await import('../userstories');

function versionConflict() {
	return new ApiError(400, "version: The version doesn't match with the current one", {
		version: "The version doesn't match with the current one"
	});
}

describe('setUserStoryStatus', () => {
	beforeEach(() => {
		patch.mockReset();
		get.mockReset();
	});

	it('sends the version it was given', async () => {
		patch.mockResolvedValue({ id: 7, version: 4 });
		await setUserStoryStatus(7, 12, 3);
		expect(patch).toHaveBeenCalledWith('/userstories/7', { status: 12, version: 3 });
	});

	it('re-reads the current version and retries when the version is stale', async () => {
		patch.mockRejectedValueOnce(versionConflict()).mockResolvedValue({ id: 7, version: 10 });
		get.mockResolvedValue({ id: 7, version: 9 });

		const result = await setUserStoryStatus(7, 12, 3);

		expect(get).toHaveBeenCalledWith('/userstories/7');
		expect(patch).toHaveBeenLastCalledWith('/userstories/7', { status: 12, version: 9 });
		expect(result.version).toBe(10);
	});

	it('retries once, not forever', async () => {
		patch.mockRejectedValue(versionConflict());
		get.mockResolvedValue({ id: 7, version: 9 });

		await expect(setUserStoryStatus(7, 12, 3)).rejects.toThrow();
		expect(patch).toHaveBeenCalledTimes(2);
	});

	it('leaves other errors alone', async () => {
		patch.mockRejectedValue(new ApiError(403, 'permission denied', { detail: 'permission denied' }));

		await expect(setUserStoryStatus(7, 12, 3)).rejects.toThrow('permission denied');
		expect(get).not.toHaveBeenCalled();
	});
});

describe('setKanbanPosition', () => {
	beforeEach(() => post.mockReset().mockResolvedValue([]));

	it('places the story after the card above it', async () => {
		await setKanbanPosition(21, 124, 206, { afterId: 205, beforeId: 207 });
		expect(post).toHaveBeenCalledWith('/userstories/bulk_update_kanban_order', {
			project_id: 21,
			status_id: 124,
			bulk_userstories: [206],
			after_userstory_id: 205
		});
	});

	it('places the story before the card below it when it went to the top', async () => {
		await setKanbanPosition(21, 124, 206, { beforeId: 205 });
		expect(post).toHaveBeenCalledWith('/userstories/bulk_update_kanban_order', {
			project_id: 21,
			status_id: 124,
			bulk_userstories: [206],
			before_userstory_id: 205
		});
	});
});
