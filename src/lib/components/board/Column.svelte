<script lang="ts">
	import type { UserStory, UserStoryStatus } from '$lib/api/types';
	import Card from './Card.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { createEventDispatcher } from 'svelte';

	export let status: UserStoryStatus;
	export let stories: UserStory[];

	const dispatch = createEventDispatcher<{
		drop: { storyId: number; newStatusId: number };
		select: UserStory;
		add: number;
	}>();

	function handleCardClick(story: UserStory) {
		dispatch('select', story);
	}

	function handleAddClick() {
		dispatch('add', status.id);
	}

	const flipDurationMs = 150;

	function handleDndConsider(e: CustomEvent<{ items: UserStory[] }>) {
		stories = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: UserStory[] }>) {
		stories = e.detail.items;
		// Dispatch drop event for any story that changed to this column
		e.detail.items.forEach(story => {
			if (story.status !== status.id) {
				dispatch('drop', { storyId: story.id, newStatusId: status.id });
			}
		});
	}

	$: totalPoints = stories.reduce((sum, s) => sum + (s.total_points || 0), 0);
</script>

<div class="column flex flex-col h-full rounded-xl p-3 min-w-[300px] max-w-[340px]">
	<!-- Column header -->
	<div class="flex items-center justify-between px-3 py-2 mb-3">
		<div class="flex items-center gap-2.5">
			<span
				class="w-2.5 h-2.5 rounded-full"
				style="background-color: {status.color || 'var(--text-muted)'}"
			></span>
			<h3 class="text-sm font-semibold" style="color: var(--text-primary);">{status.name}</h3>
			<span class="text-xs font-medium px-1.5 py-0.5 rounded" style="background-color: var(--bg-hover); color: var(--text-muted);">{stories.length}</span>
		</div>
		<span class="text-xs font-medium" style="color: var(--text-muted);">{totalPoints} pts</span>
	</div>

	<!-- Cards container with drag-drop -->
	<div
		class="overflow-y-auto space-y-2.5 min-h-[100px] max-h-[calc(100vh-220px)] px-1 py-2 rounded-lg"
		style="background-color: var(--bg-elevated); border: 1px dashed var(--border-default);"
		use:dndzone={{
			items: stories,
			flipDurationMs,
			dropTargetStyle: {},
			dropTargetClasses: []
		}}
		on:consider={handleDndConsider}
		on:finalize={handleDndFinalize}
	>
		{#each stories as story (story.id)}
			<div animate:flip={{ duration: flipDurationMs }} on:click={() => handleCardClick(story)}>
				<Card {story} />
			</div>
		{/each}
	</div>

	<!-- Add card button -->
	<button
		on:click={handleAddClick}
		class="w-full mt-3 p-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 border border-dashed"
		style="color: var(--text-muted); border-color: var(--border-default);"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		Add story
	</button>
</div>