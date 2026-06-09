<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Board from '$lib/components/board/Board.svelte';
	import IssueModal from '$lib/components/IssueModal.svelte';
	import CreateStoryModal from '$lib/components/CreateStoryModal.svelte';
	import { currentProject } from '$lib/stores/project';
	import { getUserStories, getUserStoryStatuses, getUserStory } from '$lib/api/userstories';
	import { getProjectMemberships } from '$lib/api/memberships';
	import { isArchived, unarchiveProject } from '$lib/api/projects';
	import { updateProject } from '$lib/api/projects';
	import ColumnEditor from '$lib/components/ColumnEditor.svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';

	let statuses: UserStoryStatus[] = [];
	let stories: UserStory[] = [];
	let projectMembers: User[] = [];
	let isLoading = true;
	let error = '';
	let loadedProjectId: number | null = null;

	// Modal state
	let selectedStory: UserStory | null = null;
	let showCreateModal = false;
	let createDefaultStatus: number | null = null;
	let showColumnEditor = false;

	// Editable project name
	let isEditingName = false;
	let editName = '';

	// Handle URL story param
	$: storyParam = $page.url.searchParams.get('story');
	$: if (storyParam && stories.length > 0 && !selectedStory) {
		const storyRef = parseInt(storyParam);
		const found = stories.find(s => s.ref === storyRef);
		if (found) {
			selectedStory = found;
		}
	}

	// Reload when project changes
	$: if ($currentProject && $currentProject.id !== loadedProjectId) {
		loadData($currentProject.id);
	}

	async function loadData(projectId: number) {
		isLoading = true;
		error = '';
		selectedStory = null;
		try {
			const [statusesData, storiesData, membershipsData] = await Promise.all([
				getUserStoryStatuses(projectId),
				getUserStories(projectId),
				getProjectMemberships(projectId)
			]);
			statuses = statusesData.sort((a, b) => a.order - b.order);
			stories = storiesData;
			projectMembers = membershipsData.map(m => ({
				id: m.user,
				full_name: m.full_name,
				username: m.full_name || 'user',
				photo: m.photo,
				color: m.color
			}));
			loadedProjectId = projectId;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load board';
			console.error('Failed to load board:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleStorySelect(e: CustomEvent<UserStory>) {
		selectedStory = e.detail;
		const base = $page.url.pathname;
		goto(`${base}?story=${e.detail.ref}`, { replaceState: true, noScroll: true });
	}

	function handleStoryUpdate(e: CustomEvent<UserStory>) {
		const updated = e.detail;
		const exists = stories.some(s => s.id === updated.id);
		if (exists) {
			stories = stories.map(s => s.id === updated.id ? updated : s);
			selectedStory = updated;
		} else {
			// New story (e.g. from duplicate)
			stories = [...stories, updated];
		}
	}

	function handleStoryDelete(e: CustomEvent<number>) {
		const deletedId = e.detail;
		stories = stories.filter(s => s.id !== deletedId);
		selectedStory = null;
	}

	function handleCloseDetail() {
		selectedStory = null;
		goto($page.url.pathname, { replaceState: true, noScroll: true });
	}

	function openCreateModal(statusId: number | null = null) {
		createDefaultStatus = statusId;
		showCreateModal = true;
	}

	function handleStoryCreated(e: CustomEvent<UserStory>) {
		stories = [...stories, e.detail];
		showCreateModal = false;
	}

	function handleAddToColumn(e: CustomEvent<number>) {
		openCreateModal(e.detail);
	}

	function startEditingName() {
		editName = $currentProject?.name || '';
		isEditingName = true;
	}

	async function saveProjectName() {
		if (!editName.trim() || !$currentProject) return;
		isEditingName = false;
		const prevName = $currentProject.name;
		// Optimistic
		$currentProject.name = editName.trim();
		try {
			const updated = await updateProject($currentProject.id, { name: editName.trim() });
			currentProject.set(updated);
		} catch (err) {
			$currentProject.name = prevName;
			alert('Failed to rename: ' + (err as Error).message);
		}
	}

	async function handleUnarchive() {
		if (!$currentProject) return;
		try {
			await unarchiveProject($currentProject);
			$currentProject = { ...$currentProject, tags: ($currentProject.tags || []).filter(t => t.toLowerCase() !== 'archived') };
		} catch (err) {
			alert('Failed to unarchive: ' + (err as Error).message);
		}
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveProjectName();
		else if (e.key === 'Escape') isEditingName = false;
	}
</script>

<svelte:head>
	<title>{$currentProject?.name || 'Board'} - TaigaLT</title>
</svelte:head>

{#if selectedStory}
	<!-- Full-screen story detail (replaces board) -->
	<IssueModal
		story={selectedStory}
		{statuses}
		{projectMembers}
		on:close={handleCloseDetail}
		on:update={handleStoryUpdate}
		on:delete={handleStoryDelete}
	/>
{:else}
	<div class="h-full flex flex-col">
		<!-- Header -->
		<header class="flex items-center justify-between px-6 py-4 border-b border-border">
			<div>
				{#if isEditingName}
					<input
						type="text"
						bind:value={editName}
						on:blur={saveProjectName}
						on:keydown={handleNameKeydown}
						class="text-lg font-semibold text-zinc-100 bg-transparent border-b-2 border-lt-cyan outline-none px-0 py-0"
						autofocus
					/>
				{:else}
					<h1
						class="text-lg font-semibold text-zinc-100 cursor-pointer hover:text-lt-cyan transition-colors"
						on:click={startEditingName}
						title="Click to rename"
					>
						{$currentProject?.name || 'Select a project'}
					</h1>
				{/if}
				<p class="text-sm text-zinc-500">Kanban Board</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					on:click={() => showColumnEditor = true}
					class="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded-md transition-colors flex items-center gap-1"
					title="Edit columns"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					Columns
				</button>
				<button class="btn btn-primary" on:click={() => openCreateModal()}>
					<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New Story
				</button>
			</div>
		</header>

		<!-- Archived banner -->
		{#if $currentProject && isArchived($currentProject)}
			<div class="flex items-center justify-between px-6 py-2 bg-amber-900/30 border-b border-amber-700/50 text-amber-300 text-sm">
				<span>This project is archived.</span>
				<button
					on:click={handleUnarchive}
					class="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-500 transition-colors"
				>Unarchive</button>
			</div>
		{/if}

		<!-- Board -->
		<div class="flex-1 overflow-hidden">
			{#if isLoading}
				<div class="flex items-center justify-center h-full">
					<div class="text-zinc-500">Loading board...</div>
				</div>
			{:else if error}
				<div class="flex items-center justify-center h-full">
					<div class="text-red-400">{error}</div>
				</div>
			{:else if !$currentProject}
				<div class="flex items-center justify-center h-full">
					<div class="text-zinc-500">Select a project to view the board</div>
				</div>
			{:else}
				<Board {statuses} {stories} projectId={$currentProject.id} on:select={handleStorySelect} on:addToColumn={handleAddToColumn} />
			{/if}
		</div>
	</div>

	{#if showCreateModal && $currentProject}
		<CreateStoryModal
			projectId={$currentProject.id}
			{statuses}
			{projectMembers}
			defaultStatus={createDefaultStatus}
			on:close={() => showCreateModal = false}
			on:created={handleStoryCreated}
		/>
	{/if}

	{#if showColumnEditor && $currentProject}
		<ColumnEditor
			projectId={$currentProject.id}
			on:close={() => showColumnEditor = false}
			on:updated={() => loadData($currentProject.id)}
		/>
	{/if}
{/if}
