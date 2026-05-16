<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UserStoryStatus } from '$lib/api/types';
	import { createUserStoryStatus, updateUserStoryStatus, deleteUserStoryStatus } from '$lib/api/userstories';

	export let statuses: UserStoryStatus[] = [];
	export let projectId: number;

	const dispatch = createEventDispatcher<{
		close: void;
		update: UserStoryStatus[];
	}>();

	let editing: Record<number, { name: string; color: string }> = {};
	let saving = new Set<number>();
	let deleting = new Set<number>();
	let showDeleteConfirm: number | null = null;
	let error = '';
	let moving = new Set<number>();

	function startEdit(status: UserStoryStatus) {
		editing[status.id] = { name: status.name, color: status.color };
	}

	function cancelEdit(id: number) {
		delete editing[id];
	}

	async function saveEdit(status: UserStoryStatus) {
		const changes = editing[status.id];
		if (!changes || !changes.name.trim()) return;
		saving.add(status.id);
		saving = saving;

		try {
			const updated = await updateUserStoryStatus(status.id, {
				name: changes.name.trim(),
				color: changes.color
			}, status.version);
			statuses = statuses.map(s => s.id === status.id ? updated : s);
			delete editing[status.id];
			dispatch('update', statuses);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			saving.delete(status.id);
			saving = saving;
		}
	}

	async function confirmDelete(status: UserStoryStatus) {
		showDeleteConfirm = null;
		deleting.add(status.id);
		deleting = deleting;

		try {
			await deleteUserStoryStatus(status.id);
			statuses = statuses.filter(s => s.id !== status.id);
			dispatch('update', statuses);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete';
		} finally {
			deleting.delete(status.id);
			deleting = deleting;
		}
	}

	async function addColumn() {
		const name = prompt('Column name:');
		if (!name?.trim()) return;

		let color = prompt('Color (hex, e.g. #3b82f6) or press OK for blue:', '#3b82f6');
		if (color === null) return;
		color = color.trim() || '#3b82f6';

		try {
			const created = await createUserStoryStatus({
				project: projectId,
				name: name.trim(),
				color
			});
			statuses = [...statuses, created];
			dispatch('update', statuses);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create column';
		}
	}

	async function moveColumn(status: UserStoryStatus, direction: 'up' | 'down') {
		const sorted = [...statuses].sort((a, b) => a.order - b.order);
		const idx = sorted.findIndex(s => s.id === status.id);
		if (idx === -1) return;

		const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (targetIdx < 0 || targetIdx >= sorted.length) return;

		moving.add(status.id);
		moving = moving;

		try {
			const other = sorted[targetIdx];
			const myOrder = status.order;
			const otherOrder = other.order;

			await updateUserStoryStatus(status.id, { order: otherOrder }, status.version);
			await updateUserStoryStatus(other.id, { order: myOrder }, other.version);

			statuses = [...statuses].sort((a, b) => a.order - b.order);
			dispatch('update', statuses);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reorder';
		} finally {
			moving.delete(status.id);
			moving = moving;
		}
	}

	const colorPresets = [
		'#3b82f6', '#10b981', '#f59e0b', '#ef4444',
		'#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
	];
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" on:click|self={() => dispatch('close')}>
	<div class="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-[85vh] flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
			<div>
				<h2 class="text-lg font-semibold text-zinc-100">Configure Columns</h2>
				<p class="text-sm text-zinc-400">Rename, recolor, or remove board columns</p>
			</div>
			<button class="text-zinc-400 hover:text-zinc-200 transition-colors" on:click={() => dispatch('close')}>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Error -->
		{#if error}
			<div class="mx-6 mt-4 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm">
				{error}
				<button class="ml-2 underline" on:click={() => error = ''}>dismiss</button>
			</div>
		{/if}

		<!-- Column list -->
		<div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
			{#each statuses.sort((a, b) => a.order - b.order) as status (status.id)}
				<div class="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
					<!-- Color dot -->
					<div class="w-4 h-4 rounded-full shrink-0" style="background-color: {status.color}"></div>

					{#if editing[status.id]}
						<!-- Edit mode -->
						<input
							class="flex-1 bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
							bind:value={editing[status.id].name}
							placeholder="Column name"
						/>
						<div class="flex items-center gap-1">
							{#each colorPresets as color}
								<button
									class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
									class:border-white={editing[status.id].color === color}
									class:border-transparent={editing[status.id].color !== color}
									style="background-color: {color}"
									on:click={() => editing[status.id].color = color}
									title={color}
									aria-label={"Color " + color}
								></button>
							{/each}
						</div>
						<button
							class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-medium transition-colors disabled:opacity-50"
							on:click={() => saveEdit(status)}
							disabled={saving.has(status.id)}
						>
							{saving.has(status.id) ? '...' : 'Save'}
						</button>
						<button
							class="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
							on:click={() => cancelEdit(status.id)}
						>
							Cancel
						</button>
					{:else}
						<!-- View mode -->
						<span class="flex-1 text-sm font-medium text-zinc-200 truncate">{status.name}</span>

						<!-- Move buttons -->
						<div class="flex items-center gap-0.5">
							<button
								class="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30"
								on:click={() => moveColumn(status, 'up')}
								disabled={moving.has(status.id)}
								title="Move up"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							</button>
							<button
								class="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30"
								on:click={() => moveColumn(status, 'down')}
								disabled={moving.has(status.id)}
								title="Move down"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>

						{#if showDeleteConfirm === status.id}
							<span class="text-xs text-zinc-400 mr-1">delete?</span>
							<button
								class="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
								on:click={() => confirmDelete(status)}
								disabled={deleting.has(status.id)}
							>
								{deleting.has(status.id) ? '...' : 'Yes'}
							</button>
							<button
								class="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
								on:click={() => showDeleteConfirm = null}
							>
								No
							</button>
						{:else}
							<button
								class="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors"
								on:click={() => startEdit(status)}
								title="Edit column"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
								</svg>
							</button>
							<button
								class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
								on:click={() => showDeleteConfirm = status.id}
								title="Delete column"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		<!-- Add column -->
		<div class="px-6 py-4 border-t border-zinc-700">
			<button
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 text-zinc-300 rounded-lg transition-colors font-medium"
				on:click={addColumn}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Column
			</button>
		</div>
	</div>
</div>