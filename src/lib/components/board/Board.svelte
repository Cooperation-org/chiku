<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UserStory, UserStoryStatus } from '$lib/api/types';
	import Column from './Column.svelte';
	import { api } from '$lib/api';

	export let statuses: UserStoryStatus[] = [];
	export let stories: UserStory[] = [];
	export let taskCounts: Record<number, number> = {};
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

	// Group stories by status
	$: storiesByStatus = statuses.reduce((acc, status) => {
		acc[status.id] = stories.filter(s => s.status === status.id);
		return acc;
	}, {} as Record<number, UserStory[]>);

	async function handleDrop(e: CustomEvent<{ storyId: number; newStatusId: number }>) {
		const { storyId, newStatusId } = e.detail;

		const storyIndex = stories.findIndex(s => s.id === storyId);
		if (storyIndex === -1) return;

		// Save previous state for rollback
		const previousStatus = stories[storyIndex].status;
		const previousVersion = stories[storyIndex].version;

		// Optimistically update local state
		stories[storyIndex] = { ...stories[storyIndex], status: newStatusId };
		stories = [...stories];

		// Send to API
		try {
			const updated = await api.patch<UserStory>(`/userstories/${storyId}`, {
				status: newStatusId,
				version: previousVersion
			});
			// Update version from response so subsequent drags work
			const idx = stories.findIndex(s => s.id === storyId);
			if (idx !== -1) {
				stories[idx] = { ...stories[idx], version: updated.version };
				stories = [...stories];
			}
		} catch (error) {
			console.error('Failed to update story status:', error);
			// Rollback to previous state
			const idx = stories.findIndex(s => s.id === storyId);
			if (idx !== -1) {
				stories[idx] = { ...stories[idx], status: previousStatus, version: previousVersion };
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
			{taskCounts}
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
