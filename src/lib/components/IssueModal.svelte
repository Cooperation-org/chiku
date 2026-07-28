<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';
	import { updateUserStory, getUserStory, moveUserStory, getUserStoryStatuses } from '$lib/api/userstories';
	import { getStoryComments } from '$lib/api/comments';
	import { getProject, getProjects, isArchived } from '$lib/api/projects';
	import { pointChoices, pointsPatch, storyPointId } from '$lib/api/points';
	import type { Attachment, HistoryEntry, Project } from '$lib/api/types';
	import {
		getStoryAttachments,
		uploadStoryAttachment,
		deleteStoryAttachment,
		isMarkdown,
		isPreviewableText,
		isImage,
		formatFileSize
	} from '$lib/api/attachments';
	import { renderMarkdown } from '$lib/markdown';
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
	/** Carries the point catalog and the roles — both needed to set an estimate. */
	let project: Project | null = null;

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
			project = await getProject(fullStory.project);
		} catch (err) {
			// Without it the estimate stays read-only rather than the modal breaking.
			console.error('Failed to load project:', err);
		}
		try {
			comments = await getStoryComments(story.id);
		} catch (err) {
			console.error('Failed to load comments:', err);
		} finally {
			isLoadingComments = false;
		}
		loadAttachments();
	});

	// --- Inline editing state ---
	let editingField: string | null = null;
	let editingAll = false;
	let editSubject = '';
	let editDescription = '';
	let editTagsText = '';
	let editDueDate = '';
	let isDeleting = false;
	let showDeleteConfirm = false;

	let showMoveDropdown = false;
	let moveProjects: Project[] = [];
	let isMoving = false;

	let comments: HistoryEntry[] = [];
	let isLoadingComments = true;
	let newComment = '';
	let isPostingComment = false;

	// --- Attachments ---
	let attachments: Attachment[] = [];
	let isLoadingAttachments = true;
	let attachmentError = '';
	let uploadingNames: string[] = [];
	let isDragOver = false;
	let fileInput: HTMLInputElement;
	let openAttachmentId: number | null = null;
	/** Cached inline text per attachment id; `null` while loading, Error string on failure. */
	let previewText: Record<number, string> = {};
	let previewError: Record<number, string> = {};

	async function loadAttachments() {
		isLoadingAttachments = true;
		try {
			attachments = await getStoryAttachments(story.id, fullStory.project);
			attachmentError = '';
		} catch (err) {
			console.error('Failed to load attachments:', err);
			attachmentError = (err as Error).message;
		} finally {
			isLoadingAttachments = false;
		}
	}

	async function uploadFiles(files: FileList | File[]) {
		const list = Array.from(files);
		if (list.length === 0) return;
		uploadingNames = [...uploadingNames, ...list.map((f) => f.name)];
		for (const file of list) {
			try {
				const created = await uploadStoryAttachment(story.id, fullStory.project, file);
				attachments = [...attachments, created];
				attachmentError = '';
			} catch (err) {
				console.error('Failed to upload attachment:', err);
				attachmentError = `${file.name}: ${(err as Error).message}`;
			} finally {
				uploadingNames = uploadingNames.filter((n) => n !== file.name);
			}
		}
	}

	function handleFilePick(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) uploadFiles(input.files);
		input.value = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
	}

	async function removeAttachment(a: Attachment) {
		const prev = attachments;
		attachments = attachments.filter((x) => x.id !== a.id);
		if (openAttachmentId === a.id) openAttachmentId = null;
		try {
			await deleteStoryAttachment(a.id);
		} catch (err) {
			console.error('Failed to delete attachment:', err);
			attachments = prev;
			attachmentError = `${a.name}: ${(err as Error).message}`;
		}
	}

	async function toggleAttachment(a: Attachment) {
		if (openAttachmentId === a.id) {
			openAttachmentId = null;
			return;
		}
		openAttachmentId = a.id;
		if (!isPreviewableText(a) || previewText[a.id] !== undefined) return;
		try {
			const blob = await api.getBlob(a.url);
			previewText = { ...previewText, [a.id]: await blob.text() };
		} catch (err) {
			// Media lives on the Taiga host; if it does not allow this origin the
			// browser blocks the read. The download link still works.
			previewError = { ...previewError, [a.id]: (err as Error).message };
		}
	}

	function uploaderName(a: Attachment): string {
		if (a.owner === fullStory.owner) {
			return fullStory.owner_extra_info?.full_name_display || '';
		}
		const member = projectMembers.find((m) => m.id === a.owner);
		return member?.full_name_display || member?.full_name || member?.username || '';
	}

	// Save a single field
	async function saveField(field: string, data: Record<string, unknown>) {
		const prev = { ...fullStory };
		// Optimistic update
		fullStory = { ...fullStory, ...data } as UserStory;
		dispatch('update', fullStory);
		if (!editingAll) editingField = null;

		try {
			const updated = await updateUserStory(fullStory.id, {
				...data,
				version: prev.version
			});
			fullStory = updated;
			dispatch('update', updated);
		} catch (err) {
			console.error(`Failed to save ${field}:`, err);
			fullStory = prev;
			dispatch('update', prev);
			alert('Failed to save: ' + (err as Error).message);
		}
	}

	async function startEdit(field: string) {
		if (field === 'subject') editSubject = fullStory.subject;
		if (field === 'description') editDescription = fullStory.description || '';
		if (field === 'tags') editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
		if (field === 'due_date') editDueDate = fullStory.due_date || '';
		editingField = field;
		await tick();
	}

	function toggleEditAll() {
		editingAll = !editingAll;
		if (editingAll) {
			editSubject = fullStory.subject;
			editDescription = fullStory.description || '';
			editTagsText = fullStory.tags?.map(t => t[0]).join(', ') || '';
			editDueDate = fullStory.due_date || '';
			editingField = 'all';
		} else {
			editingField = null;
		}
	}

	$: isEditing = (field: string) => editingField === field || editingField === 'all';

	// The estimate reads off the story's own per-role points, not total_points, so it
	// updates the moment someone picks — no waiting on the server to recompute a total.
	$: currentPointId = project ? storyPointId(fullStory, project) : null;
	$: currentPointName = project?.points.find((p) => p.id === currentPointId)?.name ?? null;

	function saveSubject() {
		if (!editSubject.trim()) return;
		if (editSubject.trim() === fullStory.subject) { if (!editingAll) editingField = null; return; }
		saveField('subject', { subject: editSubject.trim() });
	}

	function saveDescription() {
		if (editDescription.trim() === (fullStory.description || '')) { if (!editingAll) editingField = null; return; }
		saveField('description', { description: editDescription.trim() });
	}

	function saveStatus(e: Event) {
		const val = parseInt((e.target as HTMLSelectElement).value);
		if (val === fullStory.status) return;
		saveField('status', { status: val });
	}

	function saveAssignee(e: Event) {
		const raw = (e.target as HTMLSelectElement).value;
		const val = raw === '' ? null : parseInt(raw);
		if (val === fullStory.assigned_to) return;
		saveField('assigned_to', { assigned_to: val });
	}

	function saveDueDate() {
		if (editDueDate === (fullStory.due_date || '')) { if (!editingAll) editingField = null; return; }
		saveField('due_date', { due_date: editDueDate || null });
	}

	function savePoints(e: Event) {
		const raw = (e.target as HTMLSelectElement).value;
		const pointId = raw === '' ? null : Number(raw);
		const patch = project ? pointsPatch(pointId, project) : null;
		if (!patch) {
			editingField = null;
			return;
		}
		saveField('points', { points: patch });
	}

	function saveTags() {
		const existingTagColors = new Map(fullStory.tags?.map(t => [t[0], t[1]]) || []);
		const newTags: [string, string | null][] = editTagsText
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0)
			.map(t => [t, existingTagColors.get(t) || null]);
		saveField('tags', { tags: newTags });
	}

	async function postComment() {
		if (!newComment.trim() || isPostingComment) return;
		isPostingComment = true;
		try {
			const updated = await updateUserStory(fullStory.id, {
				comment: newComment.trim(),
				version: fullStory.version
			} as any);
			fullStory = updated;
			dispatch('update', updated);
			newComment = '';
			comments = await getStoryComments(story.id);
		} catch (err) {
			console.error('Failed to post comment:', err);
			alert('Failed to post comment: ' + (err as Error).message);
		} finally {
			isPostingComment = false;
		}
	}

	async function openMoveDropdown() {
		if (moveProjects.length === 0) {
			try {
				const all = await getProjects();
				moveProjects = all.filter(p => !isArchived(p) && p.id !== fullStory.project);
			} catch (err) {
				console.error('Failed to load projects:', err);
			}
		}
		showMoveDropdown = !showMoveDropdown;
	}

	async function handleMove(targetProject: Project) {
		if (isMoving) return;
		isMoving = true;
		showMoveDropdown = false;
		try {
			// Get first status of target project to assign
			const targetStatuses = await getUserStoryStatuses(targetProject.id);
			const firstStatus = targetStatuses.sort((a, b) => a.order - b.order)[0];
			if (!firstStatus) throw new Error('Target project has no statuses');
			const updated = await moveUserStory(fullStory.id, targetProject.id, firstStatus.id, fullStory.version);
			// Story moved — remove from current board
			dispatch('delete', fullStory.id);
			dispatch('close');
		} catch (err) {
			console.error('Failed to move story:', err);
			alert('Failed to move: ' + (err as Error).message);
		} finally {
			isMoving = false;
		}
	}

	async function handleDuplicate() {
		if (fullStory.assigned_to) {
			alert('Only unassigned stories can be duplicated.');
			return;
		}
		try {
			const { createUserStory } = await import('$lib/api/userstories');
			const copy = await createUserStory({
				project: fullStory.project,
				subject: fullStory.subject + ' (copy)',
				status: fullStory.status,
				description: fullStory.description || ''
			});
			// Also copy tags if present
			if (fullStory.tags && fullStory.tags.length > 0) {
				await updateUserStory(copy.id, { tags: fullStory.tags, version: copy.version });
			}
			dispatch('update', copy);
			dispatch('close');
		} catch (err) {
			console.error('Failed to duplicate:', err);
			alert('Failed to duplicate: ' + (err as Error).message);
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showMoveDropdown) showMoveDropdown = false;
			else if (showDeleteConfirm) showDeleteConfirm = false;
			else if (editingField) editingField = null;
			else dispatch('close');
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

<div class="h-full flex flex-col bg-white">
	<!-- Header bar -->
	<div class="flex items-center justify-between px-6 py-3 border-b border-zinc-200 shrink-0">
		<div class="flex items-center gap-3">
			<button
				on:click={() => dispatch('close')}
				class="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors"
				title="Back (Esc)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<span class="text-sm font-mono text-zinc-500">#{fullStory.ref}</span>
			<!-- Project name — click to move -->
			<div class="relative">
				<button
					on:click={openMoveDropdown}
					class="text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded px-1.5 py-0.5 transition-colors"
					title="Move to another project"
				>{fullStory.project_extra_info?.name || 'Project'}</button>
				{#if showMoveDropdown}
					<div class="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
						<div class="px-3 py-1.5 text-xs text-zinc-400 border-b border-zinc-100">Move to...</div>
						{#each moveProjects as p (p.id)}
							<button
								on:click={() => handleMove(p)}
								class="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
								disabled={isMoving}
							>{p.name}</button>
						{/each}
						{#if moveProjects.length === 0}
							<div class="px-3 py-2 text-xs text-zinc-400">Loading...</div>
						{/if}
					</div>
				{/if}
			</div>
			<!-- Status — click to change -->
			{#if isEditing('status')}
				<select
					value={fullStory.status}
					on:change={saveStatus}
					on:blur={() => editingField = null}
					class="px-2 py-0.5 text-xs rounded border border-zinc-300 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					autofocus
				>
					{#each statuses.sort((a, b) => a.order - b.order) as status}
						<option value={status.id}>{status.name}</option>
					{/each}
				</select>
			{:else}
				<button
					on:click={() => startEdit('status')}
					class="px-2 py-0.5 text-xs rounded font-medium cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow"
					style="background-color: {getStatusColor(fullStory.status)}30; color: {getStatusColor(fullStory.status)}"
					title="Click to change status"
				>
					{getStatusName(fullStory.status)}
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-1">
			<button
				on:click={toggleEditAll}
				class="p-2 rounded transition-colors {editingAll ? 'text-blue-600 bg-blue-50' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}"
				title={editingAll ? 'Stop editing' : 'Edit all fields'}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
			<button on:click={handleDuplicate} class="p-2 rounded transition-colors {fullStory.assigned_to ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}" title={fullStory.assigned_to ? 'Only unassigned stories can be duplicated' : 'Duplicate'}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			</button>
			<button on:click={() => showDeleteConfirm = true} class="p-2 text-zinc-500 hover:text-red-600 hover:bg-zinc-100 rounded transition-colors" title="Delete">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Scrollable content — all fields are inline-editable -->
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-3xl mx-auto px-6 py-6 space-y-6">

			<!-- Title -->
			{#if isEditing('subject')}
				<input
					type="text"
					bind:value={editSubject}
					on:blur={saveSubject}
					on:keydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { editingField = null; } }}
					class="w-full text-2xl font-semibold text-zinc-900 bg-transparent border-b-2 border-blue-500 outline-none px-0 py-1"
					autofocus
				/>
			{:else}
				<h1
					class="text-2xl font-semibold text-zinc-900 cursor-text hover:bg-zinc-50 rounded px-1 -mx-1 py-1 transition-colors"
					on:click={() => startEdit('subject')}
				>{fullStory.subject}</h1>
			{/if}

			<!-- Epics (read-only) -->
			{#if fullStory.epics && fullStory.epics.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each fullStory.epics as epic}
						<span class="px-2 py-1 text-xs rounded font-medium" style="background-color: {epic.color}20; color: {epic.color}">{epic.subject}</span>
					{/each}
				</div>
			{/if}

			<!-- Meta row — each item is clickable -->
			<div class="flex flex-wrap gap-4 text-sm">
				<!-- Assignee -->
				{#if isEditing('assignee')}
					<select
						value={fullStory.assigned_to ?? ''}
						on:change={saveAssignee}
						on:blur={() => editingField = null}
						class="px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
						autofocus
					>
						<option value="">Unassigned</option>
						{#each projectMembers as member}
							<option value={member.id}>{member.full_name || member.username}</option>
						{/each}
					</select>
				{:else}
					<button on:click={() => startEdit('assignee')} class="flex items-center gap-2 text-zinc-500 hover:bg-zinc-50 rounded px-2 py-1 -mx-2 transition-colors cursor-pointer" title="Click to change assignee">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
						{#if fullStory.assigned_to_extra_info}
							<span class="text-zinc-700">{fullStory.assigned_to_extra_info.full_name_display}</span>
						{:else}
							<span class="text-zinc-400">Unassigned</span>
						{/if}
					</button>
				{/if}

				<!-- Creator (read-only — Taiga does not allow reassigning it) -->
				{#if fullStory.owner_extra_info}
					<div class="flex items-center gap-2 text-zinc-500 px-2 py-1" title="Created by">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
						<span class="text-zinc-700">{fullStory.owner_extra_info.full_name_display || fullStory.owner_extra_info.username}</span>
					</div>
				{/if}

				<!-- Points -->
				{#if isEditing('points') && project}
					<select
						value={currentPointId ?? ''}
						on:change={savePoints}
						on:blur={() => editingField = null}
						class="px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
						autofocus
					>
						<option value="">No estimate</option>
						{#each pointChoices(project) as point}
							{#if point.value !== null}
								<option value={point.id}>{point.name} points</option>
							{/if}
						{/each}
					</select>
				{:else if project}
					<button on:click={() => startEdit('points')} class="flex items-center gap-2 text-zinc-500 hover:bg-zinc-50 rounded px-2 py-1 -mx-2 transition-colors cursor-pointer" title="Click to estimate">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
						{#if currentPointName}
							<span class="text-blue-600 font-medium">{currentPointName} points</span>
						{:else}
							<span class="text-zinc-400">No estimate</span>
						{/if}
					</button>
				{:else if fullStory.total_points !== null}
					<div class="flex items-center gap-2 text-zinc-500 px-2 py-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
						<span class="text-blue-600 font-medium">{fullStory.total_points} points</span>
					</div>
				{/if}

				<!-- Due date -->
				{#if isEditing('due_date')}
					<div class="flex items-center gap-2">
						<input
							type="date"
							bind:value={editDueDate}
							on:blur={saveDueDate}
							on:keydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { editingField = null; } }}
							class="px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
							autofocus
						/>
					</div>
				{:else}
					<button on:click={() => startEdit('due_date')} class="flex items-center gap-2 hover:bg-zinc-50 rounded px-2 py-1 -mx-2 transition-colors cursor-pointer {fullStory.due_date_status === 'past_due' ? 'text-red-600' : fullStory.due_date_status === 'near' ? 'text-amber-600' : 'text-zinc-500'}" title="Click to set due date">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						{#if fullStory.due_date}
							<span class="font-medium">Due {new Date(fullStory.due_date + 'T00:00:00').toLocaleDateString()}</span>
						{:else}
							<span class="text-zinc-400">Set due date</span>
						{/if}
					</button>
				{/if}

				{#if fullStory.milestone_name}
					<div class="flex items-center gap-2 text-zinc-500 px-2 py-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
						<span class="text-zinc-700">{fullStory.milestone_name}</span>
					</div>
				{/if}
			</div>

			<!-- Tags -->
			{#if isEditing('tags')}
				<div>
					<input
						type="text"
						bind:value={editTagsText}
						on:blur={saveTags}
						on:keydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { editingField = null; } }}
						placeholder="bug, feature, urgent (comma separated)"
						class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
						autofocus
					/>
				</div>
			{:else}
				<div
					class="flex flex-wrap gap-2 cursor-text hover:bg-zinc-50 rounded px-1 -mx-1 py-1 transition-colors min-h-[2rem]"
					on:click={() => startEdit('tags')}
					title="Click to edit labels"
				>
					{#if fullStory.tags && fullStory.tags.length > 0}
						{#each fullStory.tags as [tag, color]}
							<span class="px-2 py-1 text-xs rounded bg-zinc-100 text-zinc-600" style={color ? `background-color: ${color}20; color: ${color}` : ''}>{tag}</span>
						{/each}
					{:else}
						<span class="text-zinc-400 text-sm italic">Add labels...</span>
					{/if}
				</div>
			{/if}

			<!-- Description -->
			<div class="pt-4 border-t border-zinc-200">
				<h3 class="text-sm font-medium text-zinc-500 mb-2">Description</h3>
				{#if isEditing('description')}
					<textarea
						bind:value={editDescription}
						on:blur={saveDescription}
						on:keydown={(e) => { if (e.key === 'Escape') { editingField = null; } }}
						rows="12"
						class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
						placeholder="Add a description..."
						autofocus
					></textarea>
					<p class="text-xs text-zinc-400 mt-1">Click outside or press Esc to save</p>
				{:else}
					<div
						class="text-zinc-800 whitespace-pre-wrap leading-relaxed cursor-text hover:bg-zinc-50 rounded px-2 -mx-2 py-2 transition-colors min-h-[3rem]"
						on:click={() => startEdit('description')}
						title="Click to edit"
					>
						{#if fullStory.description}
							{fullStory.description}
						{:else}
							<span class="text-zinc-400 italic">Click to add a description...</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Attachments -->
			<div
				class="pt-4 border-t border-zinc-200"
				role="region"
				aria-label="Attachments"
				on:dragover|preventDefault={() => (isDragOver = true)}
				on:dragleave={() => (isDragOver = false)}
				on:drop={handleDrop}
			>
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-sm font-medium text-zinc-500">
						Attachments{attachments.length ? ` (${attachments.length})` : ''}
					</h3>
					<button
						on:click={() => fileInput.click()}
						class="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
					>Add file</button>
					<input
						bind:this={fileInput}
						type="file"
						multiple
						class="sr-only"
						on:change={handleFilePick}
					/>
				</div>

				{#if attachmentError}
					<p class="text-sm text-red-600 mb-2">{attachmentError}</p>
				{/if}

				{#if isLoadingAttachments}
					<p class="text-zinc-400 text-sm">Loading attachments...</p>
				{:else}
					<div
						class="rounded-md border border-dashed transition-colors {isDragOver
							? 'border-blue-400 bg-blue-50'
							: 'border-zinc-200'}"
					>
						{#if attachments.length === 0 && uploadingNames.length === 0}
							<button
								on:click={() => fileInput.click()}
								class="w-full px-3 py-6 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
							>Drop a file here, or click to choose one. Markdown, images, documents.</button>
						{:else}
							<ul class="divide-y divide-zinc-100">
								{#each attachments as a (a.id)}
									<li>
										<div class="flex items-center gap-3 px-3 py-2">
											<button
												on:click={() => toggleAttachment(a)}
												class="flex-1 min-w-0 text-left group"
												title={isPreviewableText(a) || isImage(a) ? 'Click to preview' : 'File'}
											>
												<span class="text-sm text-zinc-800 group-hover:text-blue-700 truncate block">{a.name}</span>
												<span class="text-xs text-zinc-400">
													{formatFileSize(a.size)}{#if uploaderName(a)} · {uploaderName(a)}{/if} · {formatCommentDate(a.created_date)}
												</span>
											</button>
											<a
												href={a.url}
												download={a.name}
												target="_blank"
												rel="noopener noreferrer"
												class="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors shrink-0"
												title="Download"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
											</a>
											<button
												on:click={() => removeAttachment(a)}
												class="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 rounded transition-colors shrink-0"
												title="Remove"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
											</button>
										</div>
										{#if openAttachmentId === a.id}
											<div class="px-3 pb-3">
												{#if isImage(a)}
													<img src={a.url} alt={a.name} class="max-w-full rounded border border-zinc-200" />
												{:else if previewError[a.id]}
													<p class="text-sm text-zinc-500">
														Cannot show this file inline.
														<a href={a.url} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Open it</a>.
													</p>
												{:else if previewText[a.id] === undefined}
													{#if isPreviewableText(a)}
														<p class="text-sm text-zinc-400">Loading preview...</p>
													{:else}
														<p class="text-sm text-zinc-500">
															No inline preview for this file type.
															<a href={a.url} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Open it</a>.
														</p>
													{/if}
												{:else if isMarkdown(a)}
													<div class="md-body text-sm text-zinc-800 bg-zinc-50 border border-zinc-200 rounded p-4 overflow-x-auto">
														{@html renderMarkdown(previewText[a.id])}
													</div>
												{:else}
													<pre class="text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded p-3 overflow-x-auto whitespace-pre-wrap">{previewText[a.id]}</pre>
												{/if}
											</div>
										{/if}
									</li>
								{/each}
								{#each uploadingNames as name}
									<li class="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400">
										<span class="flex-1 truncate">{name}</span>
										<span class="text-xs">Uploading...</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Comments -->
			<div class="pt-4 border-t border-zinc-200">
				<h3 class="text-sm font-medium text-zinc-500 mb-3">Comments</h3>
				<div class="flex gap-2 mb-4">
					<textarea bind:value={newComment} rows="2" placeholder="Add a comment..." class="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm" on:keydown={(e) => { if (e.key === 'Enter' && e.metaKey) postComment(); }}></textarea>
					<button on:click={postComment} disabled={!newComment.trim() || isPostingComment} class="px-3 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end">
						{isPostingComment ? '...' : 'Post'}
					</button>
				</div>
				{#if isLoadingComments}
					<p class="text-zinc-400 text-sm">Loading comments...</p>
				{:else if comments.length === 0}
					<p class="text-zinc-400 text-sm italic">No comments yet</p>
				{:else}
					<div class="space-y-3">
						{#each comments as comment}
							<div class="flex gap-3">
								<div class="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0 mt-0.5">
									{comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-0.5">
										<span class="text-sm font-medium text-zinc-700">{comment.user.name}</span>
										<span class="text-xs text-zinc-400">{formatCommentDate(comment.created_at)}</span>
									</div>
									<div class="text-sm text-zinc-700 whitespace-pre-wrap break-words">{comment.comment}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="pt-4 border-t border-zinc-200 text-xs text-zinc-400">
				<div class="flex flex-wrap gap-4">
					<span>
						Created{#if fullStory.owner_extra_info} by <span class="text-zinc-600 font-medium">{fullStory.owner_extra_info.full_name_display || fullStory.owner_extra_info.username}</span>{/if}
						on {new Date(fullStory.created_date).toLocaleDateString()}
					</span>
					<span>Updated: {new Date(fullStory.modified_date).toLocaleDateString()}</span>
				</div>
			</div>
		</div>
	</div>
</div>

{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" on:click={() => showDeleteConfirm = false}>
		<div class="bg-white border border-zinc-200 rounded-lg shadow-xl w-full max-w-sm mx-4" on:click|stopPropagation>
			<div class="p-4 border-b border-zinc-200">
				<h2 class="text-lg font-semibold text-zinc-900">Delete Issue</h2>
			</div>
			<div class="p-4">
				<p class="text-zinc-700">Are you sure you want to delete <strong class="text-zinc-900">#{fullStory.ref}</strong>?</p>
				<p class="text-sm text-zinc-500 mt-2">This action cannot be undone.</p>
			</div>
			<div class="p-4 border-t border-zinc-200 flex justify-end gap-2">
				<button on:click={() => showDeleteConfirm = false} class="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">Cancel</button>
				<button on:click={handleDelete} disabled={isDeleting} class="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
