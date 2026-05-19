<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { UserStory, UserStoryStatus, User, Task } from '$lib/api/types';
	import { updateUserStory, getUserStory } from '$lib/api/userstories';
	import { getTasks, createTask, updateTask, deleteTask } from '$lib/api/tasks';
	import { api } from '$lib/api';

	export let story: UserStory;
	export let statuses: UserStoryStatus[] = [];
	export let projectMembers: User[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		update: UserStory;
		delete: number;
	}>();

	let fullStory: UserStory = story;
	let isLoadingDetail = true;

	onMount(async () => {
		try {
			fullStory = await getUserStory(story.id);
			dispatch('update', fullStory);
		} catch (err) {
			console.error('Failed to load story detail:', err);
			fullStory = story;
		} finally {
			isLoadingDetail = false;
		}

		isLoadingTasks = true;
		try {
			tasks = await getTasks(story.project, story.id);
		} catch (err) {
			console.error('Failed to load tasks:', err);
		} finally {
			isLoadingTasks = false;
		}
	});

	let isEditing = false;
	let editSubject = '';
	let editDescription = '';
	let editStatus = story.status;
	let editAssignee = story.assigned_to;
	let editTagsText = '';
	let isSaving = false;
	let isDeleting = false;
	let showDeleteConfirm = false;

	let tasks: Task[] = [];
	let isLoadingTasks = false;
	let showAddTask = false;
	let newTaskSubject = '';
	let isCreatingTask = false;
	let taskError = '';

	$: if (fullStory && !isEditing) {
		editSubject = fullStory.subject;
		editDescription = fullStory.description || '';
		editStatus = fullStory.status;
		editAssignee = fullStory.assigned_to;
		editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
	}

	function startEditing() {
		editSubject = fullStory.subject;
		editDescription = fullStory.description || '';
		editStatus = fullStory.status;
		editAssignee = fullStory.assigned_to;
		editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	async function saveChanges() {
		if (!editSubject.trim() || isSaving) return;

		isSaving = true;

		const existingTagColors = new Map(fullStory.tags?.map(t => [t[0], t[1]]) || []);
		const newTags: [string, string | null][] = editTagsText
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0)
			.map(t => [t, existingTagColors.get(t) || null]);

		const optimisticStory: UserStory = {
			...fullStory,
			subject: editSubject.trim(),
			description: editDescription.trim(),
			status: editStatus,
			assigned_to: editAssignee,
			tags: newTags
		};
		fullStory = optimisticStory;
		dispatch('update', optimisticStory);
		isEditing = false;
		isSaving = false;

		try {
			const updated = await updateUserStory(fullStory.id, {
				subject: editSubject.trim(),
				description: editDescription.trim(),
				status: editStatus,
				assigned_to: editAssignee,
				tags: newTags,
				version: fullStory.version
			});
			fullStory = updated;
			dispatch('update', updated);
		} catch (err) {
			console.error('Failed to update story:', err);
			alert('Failed to save: ' + (err as Error).message);
		}
	}

	async function handleDelete() {
		if (isDeleting) return;

		isDeleting = true;
		dispatch('delete', fullStory.id);

		try {
			await api.delete(`/userstories/${fullStory.id}`);
		} catch (err) {
			console.error('Failed to delete story:', err);
			alert('Failed to delete: ' + (err as Error).message);
		}
	}

	async function handleCreateTask() {
		if (!newTaskSubject.trim() || isCreatingTask) return;

		isCreatingTask = true;
		taskError = '';

		try {
			const task = await createTask({
				project: story.project,
				subject: newTaskSubject.trim(),
				user_story: story.id
			});
			tasks = [...tasks, task];
			newTaskSubject = '';
			showAddTask = false;
		} catch (err) {
			console.error('Failed to create task:', err);
			taskError = (err as Error).message;
		} finally {
			isCreatingTask = false;
		}
	}

	async function handleToggleTask(task: Task) {
		try {
			const updated = await updateTask(task.id, { is_closed: !task.status_extra_info.is_closed, version: task.version });
			tasks = tasks.map(t => t.id === task.id ? updated : t);
		} catch (err) {
			console.error('Failed to update task:', err);
			alert('Failed to update task: ' + (err as Error).message);
		}
	}

	async function handleDeleteTask(taskId: number) {
		try {
			await deleteTask(taskId);
			tasks = tasks.filter(t => t.id !== taskId);
		} catch (err) {
			console.error('Failed to delete task:', err);
			alert('Failed to delete task: ' + (err as Error).message);
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

	function getInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
	}

	function getStatusName(statusId: number): string {
		return statuses.find(s => s.id === statusId)?.name || 'Unknown';
	}

	function getStatusColor(statusId: number): string {
		return statuses.find(s => s.id === statusId)?.color || '#666';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 flex items-center justify-center z-50 p-4 modal-backdrop" on:click={() => dispatch('close')}>
	<div class="rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col modal-content" on:click|stopPropagation>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 shrink-0" style="border-bottom: 1px solid var(--border-default);">
			<div class="flex items-center gap-3">
				<span class="text-sm font-mono" style="color: var(--text-muted);">#{fullStory.ref}</span>
				{#if !isEditing}
					<span
						class="px-2 py-0.5 text-xs rounded font-medium"
						style="background-color: {getStatusColor(fullStory.status)}30; color: {getStatusColor(fullStory.status)}"
					>
						{getStatusName(fullStory.status)}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if !isEditing}
					<button
						on:click={startEditing}
						class="p-2 rounded transition-colors"
						style="color: var(--text-muted);"
						title="Edit"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
					<button
						on:click={() => showDeleteConfirm = true}
						class="p-2 rounded transition-colors"
						style="color: var(--text-muted);"
						title="Delete"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
				<button
					on:click={() => dispatch('close')}
					class="p-2 rounded transition-colors"
					style="color: var(--text-muted);"
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
					<label class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Title</label>
					<input
						type="text"
						bind:value={editSubject}
						class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
						autofocus
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Status</label>
						<select
							bind:value={editStatus}
							class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
						>
							{#each statuses.sort((a, b) => a.order - b.order) as status}
								<option value={status.id}>{status.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Assignee</label>
						<select
							bind:value={editAssignee}
							class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
						>
							<option value={null}>Unassigned</option>
							{#each projectMembers as member}
								<option value={member.id}>{member.full_name || member.username}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Labels</label>
					<input
						type="text"
						bind:value={editTagsText}
						placeholder="bug, feature, urgent (comma separated)"
						class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">Description</label>
					<textarea
						bind:value={editDescription}
						rows="6"
						class="w-full px-3 py-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
						placeholder="Add a description..."
					></textarea>
				</div>
			{:else}
				<!-- View Mode -->
				<h2 class="text-xl font-semibold" style="color: var(--text-primary);">{fullStory.subject}</h2>

				<!-- Epics -->
				{#if fullStory.epics && fullStory.epics.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each fullStory.epics as epic}
							<span
								class="px-2 py-1 text-xs rounded"
								style="background-color: {epic.color}20; color: {epic.color}"
							>
								{epic.subject}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Meta info -->
				<div class="flex flex-wrap gap-4 text-sm">
					<div class="flex items-center gap-2" style="color: var(--text-secondary);">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						{#if fullStory.assigned_to_extra_info}
							<span style="color: var(--text-primary);">{fullStory.assigned_to_extra_info.full_name_display}</span>
						{:else}
							<span style="color: var(--text-muted);">Unassigned</span>
						{/if}
					</div>

					{#if fullStory.total_points !== null}
						<div class="flex items-center gap-2" style="color: var(--text-secondary);">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
							<span style="color: var(--accent); font-weight: 500;">{fullStory.total_points} points</span>
						</div>
					{/if}

					{#if fullStory.milestone_name}
						<div class="flex items-center gap-2" style="color: var(--text-secondary);">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span style="color: var(--text-primary);">{fullStory.milestone_name}</span>
						</div>
					{/if}
				</div>

				<!-- Tags -->
				{#if fullStory.tags && fullStory.tags.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each fullStory.tags as [tag, color]}
							<span
								class="px-2 py-1 text-xs rounded"
								style={color ? `background-color: ${color}20; color: ${color}` : `background-color: var(--bg-hover); color: var(--text-secondary);`}
							>
								{tag}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Description -->
				<div class="pt-4" style="border-top: 1px solid var(--border-default);">
					<h3 class="text-sm font-medium mb-2" style="color: var(--text-secondary);">Description</h3>
					{#if fullStory.description}
						<div class="whitespace-pre-wrap" style="color: var(--text-primary);">{fullStory.description}</div>
					{:else}
						<p style="color: var(--text-muted); font-style: italic;">No description</p>
					{/if}
				</div>

				<!-- Tasks -->
				<div class="pt-4" style="border-top: 1px solid var(--border-default);">
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-sm font-medium" style="color: var(--text-secondary);">
							Tasks
							{#if !isLoadingTasks}
								<span style="color: var(--text-muted);">({tasks.length})</span>
							{/if}
						</h3>
					</div>

					{#if showAddTask}
						<form on:submit|preventDefault={handleCreateTask} class="mb-3 flex gap-2">
							<input
								type="text"
								bind:value={newTaskSubject}
								placeholder="Task subject..."
								class="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
								autofocus
							/>
							<button
								type="submit"
								disabled={!newTaskSubject.trim() || isCreatingTask}
								class="px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
							>
								{isCreatingTask ? '...' : 'Add'}
							</button>
							<button
								type="button"
								on:click={() => { showAddTask = false; newTaskSubject = ''; }}
								class="px-3 py-2 text-sm transition-colors"
								style="color: var(--text-muted);"
							>
								Cancel
							</button>
						</form>
						{#if taskError}
							<p class="text-sm mb-2" style="color: #ef4444;">{taskError}</p>
						{/if}
					{/if}

					{#if isLoadingTasks}
						<p class="text-sm" style="color: var(--text-muted);">Loading tasks...</p>
					{:else if tasks.length === 0 && !showAddTask}
						<p class="text-sm" style="color: var(--text-muted);">No tasks yet. Click "Add task" to create one.</p>
					{:else}
						<div class="space-y-2">
							{#each tasks as task (task.id)}
								<div class="flex items-center gap-3 p-2 rounded-md group transition-colors" style="background-color: var(--bg-hover);">
									<button
										on:click={() => handleToggleTask(task)}
										class="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors"
										style={task.status_extra_info.is_closed ? 'background-color: var(--accent); border-color: var(--accent);' : 'border-color: var(--border-default);'}
									>
										{#if task.status_extra_info.is_closed}
											<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
									<span class="flex-1 text-sm" style={task.status_extra_info.is_closed ? 'color: var(--text-muted); text-decoration: line-through;' : 'color: var(--text-primary);'}>
										{task.subject}
									</span>
									<button
										on:click={() => handleDeleteTask(task.id)}
										class="opacity-0 group-hover:opacity-100 p-1 transition-all"
										style="color: var(--text-muted);"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
						<button
							on:click={() => { showAddTask = !showAddTask; newTaskSubject = ''; taskError = ''; }}
							class="mt-3 text-sm flex items-center gap-1"
							style="color: var(--accent);"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Add task
						</button>
					{/if}
				</div>

				<!-- Metadata -->
				<div class="pt-4 text-xs" style="color: var(--text-muted); border-top: 1px solid var(--border-default);">
					<div class="flex gap-4">
						<span>Created: {new Date(fullStory.created_date).toLocaleDateString()}</span>
						<span>Updated: {new Date(fullStory.modified_date).toLocaleDateString()}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if isEditing}
			<div class="p-4 flex justify-between items-center shrink-0" style="border-top: 1px solid var(--border-default);">
				<p class="text-xs" style="color: var(--text-muted);">Press <kbd class="px-1 py-0.5 rounded" style="background-color: var(--bg-hover); color: var(--text-muted);">Cmd+Enter</kbd> to save</p>
				<div class="flex gap-2">
					<button
						on:click={cancelEditing}
						class="px-4 py-2 text-sm transition-colors"
						style="color: var(--text-secondary);"
					>
						Cancel
					</button>
					<button
						on:click={saveChanges}
						disabled={!editSubject.trim() || isSaving}
						class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
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
	<div class="fixed inset-0 flex items-center justify-center z-[60] modal-backdrop" on:click={() => showDeleteConfirm = false}>
		<div class="rounded-lg shadow-xl w-full max-w-sm mx-4 modal-content" on:click|stopPropagation>
			<div class="p-4" style="border-bottom: 1px solid var(--border-default);">
				<h2 class="text-lg font-semibold" style="color: var(--text-primary);">Delete Issue</h2>
			</div>
			<div class="p-4">
				<p style="color: var(--text-secondary);">
					Are you sure you want to delete <strong style="color: var(--text-primary);">#{fullStory.ref}</strong>?
				</p>
				<p class="text-sm mt-2" style="color: var(--text-muted);">This action cannot be undone.</p>
			</div>
			<div class="p-4 flex justify-end gap-2" style="border-top: 1px solid var(--border-default);">
				<button
					on:click={() => showDeleteConfirm = false}
					class="px-4 py-2 text-sm transition-colors"
					style="color: var(--text-secondary);"
				>
					Cancel
				</button>
				<button
					on:click={handleDelete}
					disabled={isDeleting}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					style="background-color: #ef4444; color: white;"
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}