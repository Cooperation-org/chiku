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
<div class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" on:click|self={() => dispatch('close')}>
	<div class="w-full max-w-lg rounded-xl shadow-2xl max-h-[85vh] flex flex-col modal-content">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid var(--border-default);">
			<div>
				<h2 class="text-lg font-semibold" style="color: var(--text-primary);">Configure Columns</h2>
				<p class="text-sm" style="color: var(--text-muted);">Rename, recolor, or remove board columns</p>
			</div>
			<button class="transition-colors" style="color: var(--text-muted);" on:click={() => dispatch('close')}>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Error -->
		{#if error}
			<div class="mx-6 mt-4 px-4 py-3 rounded-lg text-sm" style="background-color: rgb(239 68 68 / 0.15); border: 1px solid rgb(239 68 68 / 0.3); color: #ef4444;">
				{error}
				<button class="ml-2 underline" on:click={() => error = ''}>dismiss</button>
			</div>
		{/if}

		<!-- Column list -->
		<div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
			{#each statuses.sort((a, b) => a.order - b.order) as status (status.id)}
				<div class="flex items-center gap-3 p-3 rounded-lg" style="background-color: var(--bg-hover); border: 1px solid var(--border-default);">
					<!-- Color dot -->
					<div class="w-4 h-4 rounded-full shrink-0" style="background-color: {status.color}"></div>

					{#if editing[status.id]}
						<!-- Edit mode -->
						<input
							class="flex-1 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
							style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
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
							class="px-3 py-1.5 text-sm rounded font-medium transition-colors disabled:opacity-50 btn-primary"
							on:click={() => saveEdit(status)}
							disabled={saving.has(status.id)}
						>
							{saving.has(status.id) ? '...' : 'Save'}
						</button>
						<button
							class="px-3 py-1.5 text-sm transition-colors"
							style="color: var(--text-muted);"
							on:click={() => cancelEdit(status.id)}
						>
							Cancel
						</button>
					{:else}
						<!-- View mode -->
						<span class="flex-1 text-sm font-medium truncate" style="color: var(--text-primary);">{status.name}</span>

						<!-- Move buttons -->
						<div class="flex items-center gap-0.5">
							<button
								class="p-1 rounded transition-colors disabled:opacity-30"
								style="color: var(--text-muted);"
								on:click={() => moveColumn(status, 'up')}
								disabled={moving.has(status.id)}
								title="Move up"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							</button>
							<button
								class="p-1 rounded transition-colors disabled:opacity-30"
								style="color: var(--text-muted);"
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
							<span class="text-xs mr-1" style="color: var(--text-muted);">delete?</span>
							<button
								class="px-2 py-1 text-xs rounded transition-colors"
								style="background-color: #ef4444; color: white;"
								on:click={() => confirmDelete(status)}
								disabled={deleting.has(status.id)}
							>
								{deleting.has(status.id) ? '...' : 'Yes'}
							</button>
							<button
								class="px-2 py-1 text-xs transition-colors"
								style="color: var(--text-muted);"
								on:click={() => showDeleteConfirm = null}
							>
								No
							</button>
						{:else}
							<button
								class="p-1.5 rounded transition-colors"
								style="color: var(--text-muted);"
								on:click={() => startEdit(status)}
								title="Edit column"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
								</svg>
							</button>
							<button
								class="p-1.5 rounded transition-colors"
								style="color: var(--text-muted);"
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
		<div class="px-6 py-4" style="border-top: 1px solid var(--border-default);">
			<button
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium"
				style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-secondary);"
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