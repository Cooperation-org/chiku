import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../client';

const patch = vi.fn();
const get = vi.fn();

vi.mock('../client', async () => {
	const actual = await vi.importActual<typeof import('../client')>('../client');
	return { ...actual, api: { patch: (...a: unknown[]) => patch(...a), get: (...a: unknown[]) => get(...a) } };
});

const { setUserStoryStatus } = await import('../userstories');

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
