<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UserStory, UserStoryStatus } from '$lib/api/types';
	import Column from './Column.svelte';
	import { setUserStoryStatus, setKanbanPosition } from '$lib/api/userstories';

	export let statuses: UserStoryStatus[] = [];
	export let stories: UserStory[] = [];
	export let projectId: number;

	let errorMessage = '';
	let errorTimeout: ReturnType<typeof setTimeout>;

	function showError(msg: string) {
		errorMessage = msg;
		clearTimeout(errorTimeout);
		errorTimeout = setTimeout(() => { errorMessage = ''; }, 4000);
	}

	const dispatch = createEventDispatcher<{ select: UserStory; addToColumn: number; updateStory: UserStory }>();

	function handleSelect(e: CustomEvent<UserStory>) {
		dispatch('select', e.detail);
	}

	function handleAddToColumn(e: CustomEvent<number>) {
		dispatch('addToColumn', e.detail);
	}

	// Group stories by status, each column in Taiga's kanban_order
	$: storiesByStatus = statuses.reduce((acc, status) => {
		acc[status.id] = stories
			.filter(s => s.status === status.id)
			.sort((a, b) => a.kanban_order - b.kanban_order);
		return acc;
	}, {} as Record<number, UserStory[]>);

	/** A kanban_order that sorts the card between its new neighbours until Taiga answers. */
	function orderBetween(afterId?: number, beforeId?: number): number {
		const after = stories.find(s => s.id === afterId)?.kanban_order;
		const before = stories.find(s => s.id === beforeId)?.kanban_order;
		if (after !== undefined && before !== undefined) return (after + before) / 2;
		if (after !== undefined) return after + 1;
		if (before !== undefined) return before - 1;
		return 0;
	}

	async function handleDrop(
		e: CustomEvent<{ storyId: number; newStatusId: number; afterId?: number; beforeId?: number }>
	) {
		const { storyId, newStatusId, afterId, beforeId } = e.detail;

		const storyIndex = stories.findIndex(s => s.id === storyId);
		if (storyIndex === -1) return;
		const previous = stories[storyIndex];
		const statusChanged = previous.status !== newStatusId;

		// Dropped back where it was: nothing to save.
		const column = storiesByStatus[newStatusId] || [];
		const at = column.findIndex(s => s.id === storyId);
		if (!statusChanged && column[at - 1]?.id === afterId && column[at + 1]?.id === beforeId) return;

		// Optimistically update local state
		stories[storyIndex] = {
			...previous,
			status: newStatusId,
			kanban_order: orderBetween(afterId, beforeId)
		};
		stories = [...stories];

		// Once the column change is saved, a failed reorder must not undo it on screen.
		let saved = previous;
		try {
			let version = previous.version;
			if (statusChanged) {
				version = (await setUserStoryStatus(storyId, newStatusId, previous.version)).version;
				saved = { ...previous, status: newStatusId, version };
			}
			const orders = await setKanbanPosition(previous.project, newStatusId, storyId, { afterId, beforeId });
			const byId = new Map(orders.map(o => [o.id, o.kanban_order]));
			stories = stories.map(s => {
				const order = byId.get(s.id);
				if (s.id === storyId) return { ...s, version, kanban_order: order ?? s.kanban_order };
				return order === undefined ? s : { ...s, kanban_order: order };
			});
		} catch (error) {
			console.error('Failed to move story:', error);
			// Roll back to what Taiga holds
			const idx = stories.findIndex(s => s.id === storyId);
			if (idx !== -1) {
				stories[idx] = saved;
				stories = [...stories];
			}
			const msg = error instanceof Error ? error.message : 'Failed to update story';
			if (msg.toLowerCase().includes('permission')) {
				showError('You do not have permission to move stories in this project.');
			} else {
				showError(msg);
			}
		}
	}
</script>

<div class="flex gap-4 p-4 overflow-x-auto">
	{#each statuses.sort((a, b) => a.order - b.order) as status (status.id)}
		<Column
			{status}
			stories={storiesByStatus[status.id] || []}
			on:drop={handleDrop}
			on:select={handleSelect}
			on:add={handleAddToColumn}
		/>
	{/each}
</div>

{#if errorMessage}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm shadow-lg backdrop-blur-sm">
		{errorMessage}
	</div>
{/if}
