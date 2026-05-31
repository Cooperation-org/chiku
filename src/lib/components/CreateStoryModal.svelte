<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UserStory, UserStoryStatus } from '$lib/api/types';
	import { createUserStory } from '$lib/api/userstories';

	export let projectId: number;
	export let statuses: UserStoryStatus[] = [];
	export let defaultStatus: number | null = null;

	const dispatch = createEventDispatcher<{
		close: void;
		created: UserStory;
	}>();

	let subject = '';
	let description = '';
	let status = defaultStatus || (statuses.length > 0 ? statuses[0].id : null);
	let isCreating = false;

	async function handleCreate() {
		if (!subject.trim() || isCreating) return;

		isCreating = true;
		try {
			const story = await createUserStory({
				project: projectId,
				subject: subject.trim(),
				description: description.trim(),
				status: status || undefined
			});
			dispatch('created', story);
		} catch (err) {
			console.error('Failed to create story:', err);
			alert('Failed to create story: ' + (err as Error).message);
		} finally {
			isCreating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dispatch('close');
		} else if (e.key === 'Enter' && e.metaKey) {
			handleCreate();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 flex items-center justify-center z-50 p-4 modal-backdrop" on:click={() => dispatch('close')}>
	<div class="rounded-lg shadow-2xl w-full max-w-lg modal-content" on:click|stopPropagation>
		<div class="p-4 border-b" style="border-color: var(--border-default);">
			<h2 class="text-lg font-semibold" style="color: var(--text-primary);">New Story</h2>
		</div>

		<div class="p-4 space-y-4">
			<div>
				<label for="story-subject" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Title</label>
				<input
					id="story-subject"
					type="text"
					bind:value={subject}
					placeholder="What needs to be done?"
					class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
					autofocus
				/>
			</div>

			{#if statuses.length > 0}
				<div>
					<label for="story-status" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Status</label>
					<select
						id="story-status"
						bind:value={status}
						class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
					>
						{#each statuses.sort((a, b) => a.order - b.order) as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div>
				<label for="story-desc" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Description</label>
				<textarea
					id="story-desc"
					bind:value={description}
					placeholder="Add details (optional)"
					rows="3"
					class="w-full px-3 py-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
				></textarea>
			</div>
		</div>

		<div class="p-4 border-t flex justify-between items-center" style="border-color: var(--border-default);">
			<p class="text-xs" style="color: var(--text-muted);">Press <kbd class="px-1 py-0.5 rounded" style="background-color: var(--bg-hover); color: var(--text-muted);">Cmd+Enter</kbd> to create</p>
			<div class="flex gap-2">
				<button
					on:click={() => dispatch('close')}
					class="px-4 py-2 text-sm transition-colors"
					style="color: var(--text-secondary);"
				>
					Cancel
				</button>
				<button
					on:click={handleCreate}
					disabled={!subject.trim() || isCreating}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
				>
					{isCreating ? 'Creating...' : 'Create Story'}
				</button>
			</div>
		</div>
	</div>
</div>