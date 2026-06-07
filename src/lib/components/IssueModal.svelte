<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';
	import { updateUserStory, getUserStory } from '$lib/api/userstories';
	import { getStoryComments } from '$lib/api/comments';
	import type { HistoryEntry } from '$lib/api/types';
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

	// Fetch full story detail and comments
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

		try {
			comments = await getStoryComments(story.id);
		} catch (err) {
			console.error('Failed to load comments:', err);
		} finally {
			isLoadingComments = false;
		}
	});

	async function postComment() {
		if (!newComment.trim() || isPostingComment) return;

		isPostingComment = true;
		try {
			// Taiga adds comments via PATCH with a comment field
			const updated = await updateUserStory(fullStory.id, {
				comment: newComment.trim(),
				version: fullStory.version
			} as any);
			fullStory = updated;
			dispatch('update', updated);
			newComment = '';
			// Reload comments
			comments = await getStoryComments(story.id);
		} catch (err) {
			console.error('Failed to post comment:', err);
			alert('Failed to post comment: ' + (err as Error).message);
		} finally {
			isPostingComment = false;
		}
	}

	function formatCommentDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	let isEditing = false;
	let editSubject = '';
	let editDescription = '';
	let editStatus = story.status;
	let editAssignee = story.assigned_to;
	let editTagsText = '';
	let editDueDate = '';
	let isSaving = false;
	let isDeleting = false;
	let showDeleteConfirm = false;

	// Comments
	let comments: HistoryEntry[] = [];
	let isLoadingComments = true;
	let newComment = '';
	let isPostingComment = false;

	// Update edit fields when fullStory loads
	$: if (fullStory && !isEditing) {
		editSubject = fullStory.subject;
		editDescription = fullStory.description || '';
		editStatus = fullStory.status;
		editAssignee = fullStory.assigned_to;
		editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
		editDueDate = fullStory.due_date || '';
	}

	function startEditing() {
		editSubject = fullStory.subject;
		editDescription = fullStory.description || '';
		editStatus = fullStory.status;
		editAssignee = fullStory.assigned_to;
		editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
		editDueDate = fullStory.due_date || '';
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	async function saveChanges() {
		if (!editSubject.trim() || isSaving) return;

		isSaving = true;

		// Parse tags - keep existing colors where possible
		const existingTagColors = new Map(fullStory.tags?.map(t => [t[0], t[1]]) || []);
		const newTags: [string, string | null][] = editTagsText
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0)
			.map(t => [t, existingTagColors.get(t) || null]);

		// Optimistic update - close edit mode immediately
		const optimisticStory: UserStory = {
			...fullStory,
			subject: editSubject.trim(),
			description: editDescription.trim(),
			status: editStatus,
			assigned_to: editAssignee,
			due_date: editDueDate || null,
			tags: newTags
		};
		fullStory = optimisticStory;
		dispatch('update', optimisticStory);
		isEditing = false;
		isSaving = false;

		// Save in background
		try {
			const updated = await updateUserStory(fullStory.id, {
				subject: editSubject.trim(),
				description: editDescription.trim(),
				status: editStatus,
				assigned_to: editAssignee,
				due_date: editDueDate || null,
				tags: newTags,
				version: fullStory.version
			});
			// Update with server response (has new version, etc)
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
		// Optimistic: close immediately, delete in background
		dispatch('delete', fullStory.id);

		try {
			await api.delete(`/userstories/${fullStory.id}`);
		} catch (err) {
			console.error('Failed to delete story:', err);
			alert('Failed to delete: ' + (err as Error).message);
			// Note: story already removed from UI, would need reload to restore
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

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" on:click={() => dispatch('close')}>
	<div
		class="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
		on:click|stopPropagation
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-border shrink-0">
			<div class="flex items-center gap-3">
				<span class="text-sm font-mono text-zinc-500">#{fullStory.ref}</span>
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

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-zinc-400 mb-1">Status</label>
						<select
							bind:value={editStatus}
							class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
						>
							{#each statuses.sort((a, b) => a.order - b.order) as status}
								<option value={status.id}>{status.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-zinc-400 mb-1">Assignee</label>
						<select
							bind:value={editAssignee}
							class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
						>
							<option value={null}>Unassigned</option>
							{#each projectMembers as member}
								<option value={member.id}>{member.full_name || member.username}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-1">Due Date</label>
					<input
						type="date"
						bind:value={editDueDate}
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-1">Labels</label>
					<input
						type="text"
						bind:value={editTagsText}
						placeholder="bug, feature, urgent (comma separated)"
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-zinc-400 mb-1">Description</label>
					<textarea
						bind:value={editDescription}
						rows="6"
						class="w-full px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none"
						placeholder="Add a description..."
					></textarea>
				</div>
			{:else}
				<!-- View Mode -->
				<h2 class="text-xl font-semibold text-zinc-100">{fullStory.subject}</h2>

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
					<div class="flex items-center gap-2 text-zinc-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						{#if fullStory.assigned_to_extra_info}
							<span class="text-zinc-300">{fullStory.assigned_to_extra_info.full_name_display}</span>
						{:else}
							<span class="text-zinc-500">Unassigned</span>
						{/if}
					</div>

					{#if fullStory.total_points !== null}
						<div class="flex items-center gap-2 text-zinc-400">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
							<span class="text-lt-cyan font-medium">{fullStory.total_points} points</span>
						</div>
					{/if}

					{#if fullStory.due_date}
						<div class="flex items-center gap-2" class:text-red-400={fullStory.due_date_status === 'past_due'} class:text-yellow-400={fullStory.due_date_status === 'near'} class:text-zinc-400={!fullStory.due_date_status || fullStory.due_date_status === 'set'}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="font-medium">Due {new Date(fullStory.due_date + 'T00:00:00').toLocaleDateString()}</span>
						</div>
					{/if}

					{#if fullStory.milestone_name}
						<div class="flex items-center gap-2 text-zinc-400">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span class="text-zinc-300">{fullStory.milestone_name}</span>
						</div>
					{/if}
				</div>

				<!-- Tags -->
				{#if fullStory.tags && fullStory.tags.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each fullStory.tags as [tag, color]}
							<span
								class="px-2 py-1 text-xs rounded bg-surface-3 text-zinc-400"
								style={color ? `background-color: ${color}30; color: ${color}` : ''}
							>
								{tag}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Description -->
				<div class="pt-4 border-t border-border">
					<h3 class="text-sm font-medium text-zinc-400 mb-2">Description</h3>
					{#if fullStory.description}
						<div class="text-zinc-300 whitespace-pre-wrap">{fullStory.description}</div>
					{:else}
						<p class="text-zinc-500 italic">No description</p>
					{/if}
				</div>

				<!-- Comments -->
				<div class="pt-4 border-t border-border">
					<h3 class="text-sm font-medium text-zinc-400 mb-3">Comments</h3>

					<!-- Add comment -->
					<div class="flex gap-2 mb-4">
						<textarea
							bind:value={newComment}
							rows="2"
							placeholder="Add a comment..."
							class="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:border-transparent resize-none text-sm"
							on:keydown={(e) => { if (e.key === 'Enter' && e.metaKey) postComment(); }}
						></textarea>
						<button
							on:click={postComment}
							disabled={!newComment.trim() || isPostingComment}
							class="px-3 py-2 text-sm bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
						>
							{isPostingComment ? '...' : 'Post'}
						</button>
					</div>

					<!-- Comment list -->
					{#if isLoadingComments}
						<p class="text-zinc-500 text-sm">Loading comments...</p>
					{:else if comments.length === 0}
						<p class="text-zinc-500 text-sm italic">No comments yet</p>
					{:else}
						<div class="space-y-3">
							{#each comments as comment}
								<div class="flex gap-3">
									<div class="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-zinc-400 shrink-0 mt-0.5">
										{comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-0.5">
											<span class="text-sm font-medium text-zinc-300">{comment.user.name}</span>
											<span class="text-xs text-zinc-500">{formatCommentDate(comment.created_at)}</span>
										</div>
										<div class="text-sm text-zinc-300 whitespace-pre-wrap break-words">{comment.comment}</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Metadata -->
				<div class="pt-4 border-t border-border text-xs text-zinc-500">
					<div class="flex gap-4">
						<span>Created: {new Date(fullStory.created_date).toLocaleDateString()}</span>
						<span>Updated: {new Date(fullStory.modified_date).toLocaleDateString()}</span>
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
				<h2 class="text-lg font-semibold text-zinc-100">Delete Issue</h2>
			</div>
			<div class="p-4">
				<p class="text-zinc-300">
					Are you sure you want to delete <strong class="text-zinc-100">#{fullStory.ref}</strong>?
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
