<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';
	import { createUserStory } from '$lib/api/userstories';

	export let projectId: number;
	export let statuses: UserStoryStatus[] = [];
	export let defaultStatus: number | null = null;
	export let projectMembers: User[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		created: UserStory;
	}>();

	let subject = '';
	let description = '';
	let status = defaultStatus || (statuses.length > 0 ? statuses[0].id : null);
	let assignedTo: number | string = '';
	let isCreating = false;

	async function handleCreate() {
		if (!subject.trim() || isCreating) return;

		isCreating = true;
		try {
			const story = await createUserStory({
				project: projectId,
				subject: subject.trim(),
				description: description.trim(),
				status: status || undefined,
				assigned_to: assignedTo ? Number(assignedTo) : null
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

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-lg"
		on:click|stopPropagation
	>
		<div class="p-4 border-b border-border">
			<h2 class="text-lg font-semibold text-zinc-100">New Story</h2>
		</div>

		<div class="p-4 space-y-4">
			<div>
				<label for="story-subject" class="block text-sm font-medium text-zinc-400 mb-1">Title</label>
				<input
					id="story-subject"
					type="text"
					bind:value={subject}
					placeholder="What needs to be done?"
					class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
					autofocus
				/>
			</div>

			{#if statuses.length > 0}
				<div>
					<label for="story-status" class="block text-sm font-medium text-zinc-400 mb-1">Status</label>
					<select
						id="story-status"
						bind:value={status}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
					>
						{#each statuses.sort((a, b) => a.order - b.order) as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if projectMembers.length > 0}
				<div>
					<label for="story-assignee" class="block text-sm font-medium text-zinc-400 mb-1">Assignee</label>
					<select
						id="story-assignee"
						bind:value={assignedTo}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
					>
						<option value="">Unassigned</option>
						{#each projectMembers as member}
							<option value={member.id}>{member.full_name || member.username}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div>
				<label for="story-desc" class="block text-sm font-medium text-zinc-400 mb-1">Description</label>
				<textarea
					id="story-desc"
					bind:value={description}
					placeholder="Add details (optional)"
					rows="3"
					class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none"
				></textarea>
			</div>
		</div>

		<div class="p-4 border-t border-border flex justify-between items-center">
			<p class="text-xs text-zinc-600">Press <kbd class="px-1 py-0.5 bg-surface-2 rounded text-zinc-500">Cmd+Enter</kbd> to create</p>
			<div class="flex gap-2">
				<button
					on:click={() => dispatch('close')}
					class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
				>
					Cancel
				</button>
				<button
					on:click={handleCreate}
					disabled={!subject.trim() || isCreating}
					class="px-4 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isCreating ? 'Creating...' : 'Create Story'}
				</button>
			</div>
		</div>
	</div>
</div>
