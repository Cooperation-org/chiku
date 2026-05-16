<script lang="ts">
	import type { UserStory, UserStoryStatus } from '$lib/api/types';
	import Card from './Card.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { createEventDispatcher } from 'svelte';

	export let status: UserStoryStatus;
	export let stories: UserStory[];
	export let taskCounts: Record<number, number> = {};

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

<div class="column flex flex-col">
	<!-- Column header -->
	<div class="flex items-center justify-between px-2 py-1 mb-2">
		<div class="flex items-center gap-2">
			<span
				class="w-2 h-2 rounded-full"
				style="background-color: {status.color || '#666'}"
			></span>
			<h3 class="text-sm font-medium text-zinc-300">{status.name}</h3>
			<span class="text-xs text-zinc-500">{stories.length}</span>
		</div>
		<span class="text-xs text-zinc-500">{totalPoints} pts</span>
	</div>

	<!-- Cards container with drag-drop -->
	<div
		class="overflow-y-auto space-y-2 min-h-[100px] max-h-[calc(100vh-220px)]"
		use:dndzone={{
			items: stories,
			flipDurationMs,
			dropTargetStyle: {},
			dropTargetClasses: ['bg-lt-cyan/5', 'border-lt-cyan/20', 'border', 'border-dashed', 'rounded-lg']
		}}
		on:consider={handleDndConsider}
		on:finalize={handleDndFinalize}
	>
		{#each stories as story (story.id)}
			<div animate:flip={{ duration: flipDurationMs }} on:click={() => handleCardClick(story)}>
				<Card {story} taskCount={taskCounts[story.id] || 0} />
			</div>
		{/each}
	</div>

	<!-- Add card button -->
	<button
		on:click={handleAddClick}
		class="w-full mt-2 p-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-surface-3 rounded-md transition-colors flex items-center justify-center gap-1"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		Add story
	</button>
</div>
