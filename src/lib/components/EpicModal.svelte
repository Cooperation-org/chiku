<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Epic } from '$lib/api/types';
	import { updateEpic } from '$lib/api/epics';
	import { api } from '$lib/api';
	import { canEdit } from '$lib/stores/permissions';

	export let epic: Epic;

	const dispatch = createEventDispatcher<{
		close: void;
		update: Epic;
		delete: number;
	}>();

	let isEditing = false;
	let editSubject = epic.subject;
	let editDescription = epic.description || '';
	let editColor = epic.color;
	let isSaving = false;
	let isDeleting = false;
	let showDeleteConfirm = false;

	const colors = [
		'#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
		'#eab308', '#22c55e', '#14b8a6', '#06b6d4',
	];

	function startEditing() {
		editSubject = epic.subject;
		editDescription = epic.description || '';
		editColor = epic.color;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	async function saveChanges() {
		if (!editSubject.trim() || isSaving) return;

		isSaving = true;
		try {
			const updated = await updateEpic(epic.id, {
				subject: editSubject.trim(),
				description: editDescription.trim(),
				color: editColor
			});
			dispatch('update', updated);
			isEditing = false;
		} catch (err) {
			console.error('Failed to update epic:', err);
			alert('Failed to update: ' + (err as Error).message);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		if (isDeleting) return;

		isDeleting = true;
		try {
			await api.delete(`/epics/${epic.id}`);
			dispatch('delete', epic.id);
		} catch (err) {
			console.error('Failed to delete epic:', err);
			alert('Failed to delete: ' + (err as Error).message);
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showDeleteConfirm) {
				showDeleteConfirm = false;
			} else if (isEditing) {
				cancelEditing();
			} else {
				dispatch('close');
			}
		} else if (e.key === 'Enter' && e.metaKey && isEditing) {
			saveChanges();
		}
	}

	function getProgress(): number {
		const counts = epic.user_stories_counts;
		if (!counts || counts.total === 0) return 0;
		return Math.round((counts.progress / counts.total) * 100);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col"
		on:click|stopPropagation
	>
		<!-- Color bar -->
		<div class="h-2 rounded-t-lg" style="background-color: {isEditing ? editColor : epic.color}"></div>

		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-border shrink-0">
			<div class="flex items-center gap-3">
				<span class="text-sm font-mono text-zinc-500">#{epic.ref}</span>
				{#if !isEditing}
					<span
						class="px-2 py-0.5 text-xs rounded font-medium"
						style="background-color: {epic.status_extra_info.color}30; color: {epic.status_extra_info.color}"
					>
						{epic.status_extra_info.name}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if !isEditing && $canEdit}
					<button
						on:click={startEditing}
						class="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded transition-colors"
						title="Edit"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
					<button
						on:click={() => showDeleteConfirm = true}
						class="p-2 text-zinc-400 hover:text-red-400 hover:bg-surface-3 rounded transition-colors"
						title="Delete"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
				<button
					on:click={() => dispatch('close')}
					class="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded transition-colors"
					title="Close (Esc)"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#if isEditing}
				<!-- Edit Mode -->
				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-1">Title</label>
					<input
						type="text"
						bind:value={editSubject}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
						autofocus
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-2">Color</label>
					<div class="flex gap-2 flex-wrap">
						{#each colors as c}
							<button
								type="button"
								on:click={() => editColor = c}
								class="w-8 h-8 rounded-full transition-transform {editColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-1 scale-110' : 'hover:scale-110'}"
								style="background-color: {c}"
							></button>
						{/each}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-1">Description</label>
					<textarea
						bind:value={editDescription}
						rows="4"
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none"
						placeholder="Add a description..."
					></textarea>
				</div>
			{:else}
				<!-- View Mode -->
				<h2 class="text-xl font-semibold text-zinc-100">{epic.subject}</h2>

				<!-- Progress -->
				<div>
					<div class="flex items-center justify-between text-sm mb-1">
						<span class="text-zinc-500">Progress</span>
						<span class="text-zinc-400">{getProgress()}% · {epic.user_stories_counts?.progress || 0}/{epic.user_stories_counts?.total || 0} stories</span>
					</div>
					<div class="h-2 bg-surface-3 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-300"
							style="width: {getProgress()}%; background-color: {epic.color}"
						></div>
					</div>
				</div>

				<!-- Description -->
				<div class="pt-4 border-t border-border">
					<h3 class="text-sm font-medium text-zinc-400 mb-2">Description</h3>
					{#if epic.description}
						<div class="text-zinc-300 whitespace-pre-wrap">{epic.description}</div>
					{:else}
						<p class="text-zinc-500 italic">No description</p>
					{/if}
				</div>

				<!-- Metadata -->
				<div class="pt-4 border-t border-border text-xs text-zinc-500">
					<div class="flex gap-4">
						<span>Created: {new Date(epic.created_date).toLocaleDateString()}</span>
						<span>Updated: {new Date(epic.modified_date).toLocaleDateString()}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if isEditing}
			<div class="p-4 border-t border-border flex justify-between items-center shrink-0">
				<p class="text-xs text-zinc-600">Press <kbd class="px-1 py-0.5 bg-surface-2 rounded text-zinc-500">Cmd+Enter</kbd> to save</p>
				<div class="flex gap-2">
					<button
						on:click={cancelEditing}
						class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
					>
						Cancel
					</button>
					<button
						on:click={saveChanges}
						disabled={!editSubject.trim() || isSaving}
						class="px-4 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" on:click={() => showDeleteConfirm = false}>
		<div
			class="bg-surface-1 border border-border rounded-lg shadow-xl w-full max-w-sm mx-4"
			on:click|stopPropagation
		>
			<div class="p-4 border-b border-border">
				<h2 class="text-lg font-semibold text-zinc-100">Delete Epic</h2>
			</div>
			<div class="p-4">
				<p class="text-zinc-300">
					Are you sure you want to delete <strong class="text-zinc-100">#{epic.ref}</strong>?
				</p>
				<p class="text-sm text-zinc-500 mt-2">This action cannot be undone.</p>
			</div>
			<div class="p-4 border-t border-border flex justify-end gap-2">
				<button
					on:click={() => showDeleteConfirm = false}
					class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
				>
					Cancel
				</button>
				<button
					on:click={handleDelete}
					disabled={isDeleting}
					class="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
