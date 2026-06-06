<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import type { UserStoryStatus } from '$lib/api/types';
	import {
		getStatuses,
		createStatus,
		updateStatus,
		deleteStatus,
		bulkUpdateStatusOrder
	} from '$lib/api/statuses';

	export let projectId: number;

	const dispatch = createEventDispatcher<{ close: void; updated: void }>();

	let statuses: UserStoryStatus[] = [];
	let isLoading = true;
	let error = '';
	let saving = false;

	// New column form
	let newName = '';
	let newColor = '#999999';
	let isAdding = false;

	// Inline editing
	let editingId: number | null = null;
	let editName = '';
	let editColor = '';
	let editIsClosed = false;

	// Delete confirmation
	let deletingStatus: UserStoryStatus | null = null;
	let moveToId: number | null = null;

	const presetColors = [
		'#999999', '#70CF97', '#40A8E5', '#F57D7D',
		'#FFC66D', '#C49ADE', '#FF9F43', '#54D1DB',
		'#E8516D', '#8BC34A', '#607D8B', '#FF5722'
	];

	async function load() {
		isLoading = true;
		error = '';
		try {
			statuses = (await getStatuses(projectId)).sort((a, b) => a.order - b.order);
		} catch (err) {
			error = (err as Error).message;
		} finally {
			isLoading = false;
		}
	}

	load();

	async function addColumn() {
		if (!newName.trim() || isAdding) return;
		isAdding = true;
		try {
			const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order), 0);
			const created = await createStatus({
				project: projectId,
				name: newName.trim(),
				color: newColor,
				order: maxOrder + 1
			});
			statuses = [...statuses, created];
			newName = '';
			newColor = '#999999';
			dispatch('updated');
		} catch (err) {
			error = (err as Error).message;
		} finally {
			isAdding = false;
		}
	}

	function startEdit(status: UserStoryStatus) {
		editingId = status.id;
		editName = status.name;
		editColor = status.color;
		editIsClosed = status.is_closed;
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit() {
		if (editingId === null || !editName.trim()) return;
		saving = true;
		try {
			const updated = await updateStatus(editingId, {
				name: editName.trim(),
				color: editColor,
				is_closed: editIsClosed
			});
			statuses = statuses.map(s => s.id === updated.id ? updated : s);
			editingId = null;
			dispatch('updated');
		} catch (err) {
			error = (err as Error).message;
		} finally {
			saving = false;
		}
	}

	function startDelete(status: UserStoryStatus) {
		deletingStatus = status;
		const other = statuses.find(s => s.id !== status.id);
		moveToId = other?.id ?? null;
	}

	function cancelDelete() {
		deletingStatus = null;
		moveToId = null;
	}

	async function confirmDelete() {
		if (!deletingStatus || moveToId === null) return;
		saving = true;
		try {
			await deleteStatus(deletingStatus.id, moveToId);
			statuses = statuses.filter(s => s.id !== deletingStatus!.id);
			deletingStatus = null;
			moveToId = null;
			dispatch('updated');
		} catch (err) {
			error = (err as Error).message;
		} finally {
			saving = false;
		}
	}

	// Drag and drop reordering
	const flipDurationMs = 150;

	function handleDndConsider(e: CustomEvent<{ items: UserStoryStatus[] }>) {
		statuses = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<{ items: UserStoryStatus[] }>) {
		statuses = e.detail.items;
		// Build order pairs: [statusId, newOrder]
		const orderPairs: Array<[number, number]> = statuses.map((s, i) => [s.id, i + 1]);
		try {
			await bulkUpdateStatusOrder(projectId, orderPairs);
			// Update local order values
			statuses = statuses.map((s, i) => ({ ...s, order: i + 1 }));
			dispatch('updated');
		} catch (err) {
			error = (err as Error).message;
			await load(); // reload on failure
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
		on:click|stopPropagation
	>
		<!-- Header -->
		<div class="p-4 border-b border-border flex items-center justify-between">
			<h2 class="text-lg font-semibold text-zinc-100">Edit Columns</h2>
			<button on:click={() => dispatch('close')} class="text-zinc-500 hover:text-zinc-300">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if error}
				<div class="mb-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded text-red-400 text-sm">
					{error}
					<button on:click={() => error = ''} class="ml-2 underline">dismiss</button>
				</div>
			{/if}

			{#if isLoading}
				<p class="text-zinc-500 text-sm">Loading columns...</p>
			{:else}
				<!-- Draggable column list -->
				<div
					use:dndzone={{ items: statuses, flipDurationMs, dropTargetStyle: {} }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
					class="space-y-1"
				>
					{#each statuses as status (status.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							{#if editingId === status.id}
								<!-- Edit mode -->
								<div class="flex items-center gap-2 p-2 bg-surface-2 rounded-md border border-border">
									<input
										type="color"
										bind:value={editColor}
										class="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
									/>
									<input
										type="text"
										bind:value={editName}
										class="flex-1 px-2 py-1 bg-surface-3 border border-border rounded text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
										on:keydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
										autofocus
									/>
									<label class="flex items-center gap-1 text-xs text-zinc-400">
										<input type="checkbox" bind:checked={editIsClosed} class="rounded" />
										Closed
									</label>
									<button on:click={saveEdit} disabled={saving} class="text-lt-cyan hover:text-lt-cyan/80 text-sm">Save</button>
									<button on:click={cancelEdit} class="text-zinc-500 hover:text-zinc-300 text-sm">Cancel</button>
								</div>
							{:else}
								<!-- Display mode -->
								<div class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-2 group cursor-grab">
									<svg class="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
									</svg>
									<span
										class="w-3 h-3 rounded-full shrink-0"
										style="background-color: {status.color || '#666'}"
									></span>
									<span class="flex-1 text-sm text-zinc-200">{status.name}</span>
									{#if status.is_closed}
										<span class="text-xs text-zinc-500 bg-surface-3 px-1.5 py-0.5 rounded">closed</span>
									{/if}
									<button
										on:click={() => startEdit(status)}
										class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
										title="Edit"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									{#if statuses.length > 1}
										<button
											on:click={() => startDelete(status)}
											class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
											title="Delete"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Add new column -->
				<div class="mt-4 pt-4 border-t border-border">
					<div class="flex items-center gap-2">
						<input
							type="color"
							bind:value={newColor}
							class="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
						/>
						<input
							type="text"
							bind:value={newName}
							placeholder="New column name..."
							class="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
							on:keydown={(e) => { if (e.key === 'Enter') addColumn(); }}
						/>
						<button
							on:click={addColumn}
							disabled={!newName.trim() || isAdding}
							class="px-3 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isAdding ? '...' : 'Add'}
						</button>
					</div>
					<!-- Color presets -->
					<div class="flex gap-1 mt-2 ml-9">
						{#each presetColors as color}
							<button
								on:click={() => newColor = color}
								class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
								style="background-color: {color}; border-color: {newColor === color ? '#fff' : 'transparent'}"
							></button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Delete confirmation overlay -->
		{#if deletingStatus}
			<div class="absolute inset-0 bg-surface-1/95 rounded-lg flex items-center justify-center p-6">
				<div class="text-center space-y-4 max-w-sm">
					<h3 class="text-zinc-100 font-medium">Delete "{deletingStatus.name}"?</h3>
					<p class="text-sm text-zinc-400">Stories in this column will be moved to:</p>
					<select
						bind:value={moveToId}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
					>
						{#each statuses.filter(s => s.id !== deletingStatus?.id) as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
					<div class="flex justify-center gap-3">
						<button on:click={cancelDelete} class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
						<button
							on:click={confirmDelete}
							disabled={saving}
							class="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-md hover:bg-red-500 disabled:opacity-50"
						>
							{saving ? 'Deleting...' : 'Delete Column'}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
