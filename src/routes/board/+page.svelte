<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Board from '$lib/components/board/Board.svelte';
	import ConfigureBoardModal from '$lib/components/board/ConfigureBoardModal.svelte';
	import IssueModal from '$lib/components/IssueModal.svelte';
	import CreateStoryModal from '$lib/components/CreateStoryModal.svelte';
	import { currentProject } from '$lib/stores/project';
	import { getUserStories, getUserStoryStatuses, getUserStory } from '$lib/api/userstories';
	import { getProjectMemberships } from '$lib/api/memberships';
	import { getTasks } from '$lib/api/tasks';
	import type { UserStory, UserStoryStatus, User, Membership, Task } from '$lib/api/types';

	let statuses: UserStoryStatus[] = [];
	let stories: UserStory[] = [];
	let projectMembers: User[] = [];
	let taskCounts: Record<number, number> = {}; // storyId -> task count
	let isLoading = true;
	let error = '';

	// Modal state
	let selectedStory: UserStory | null = null;
	let showCreateModal = false;
	let createDefaultStatus: number | null = null;
	let showConfigure = false;

	// Theme state
	let isDark = true;

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			isDark = savedTheme === 'dark';
		} else {
			isDark = true;
		}
		applyTheme();
	});

	function applyTheme() {
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		applyTheme();
	}

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
	$: if ($currentProject) {
		loadData($currentProject.id);
	}

	async function loadData(projectId: number) {
		isLoading = true;
		error = '';
		try {
			const [statusesData, storiesData, membershipsData, tasksData] = await Promise.all([
				getUserStoryStatuses(projectId),
				getUserStories(projectId),
				getProjectMemberships(projectId),
				getTasks(projectId)
			]);
			statuses = statusesData.sort((a, b) => a.order - b.order);
			stories = storiesData;
			// Map memberships to User format for assignee dropdown
			projectMembers = membershipsData.map((m: Membership) => ({
				id: m.user,
				full_name: m.full_name,
				full_name_display: m.full_name,
				email: m.email || '',
				username: m.email?.split('@')[0] || 'user',
				photo: m.photo,
				color: m.color,
				big_photo: null
			}));
			// Count tasks per story
			taskCounts = {};
			for (const task of tasksData) {
				if (task.user_story) {
					taskCounts[task.user_story] = (taskCounts[task.user_story] || 0) + 1;
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load board';
			console.error('Failed to load board:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleStorySelect(e: CustomEvent<UserStory>) {
		selectedStory = e.detail;
		goto(`?story=${e.detail.ref}`, { replaceState: true, noScroll: true });
	}

	function handleStoryUpdate(e: CustomEvent<UserStory>) {
		const updated = e.detail;
		stories = stories.map(s => s.id === updated.id ? updated : s);
		selectedStory = updated;
	}

	function handleStoryDelete(e: CustomEvent<number>) {
		const deletedId = e.detail;
		stories = stories.filter(s => s.id !== deletedId);
		selectedStory = null;
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

	function handleStatusesUpdate(e: CustomEvent<UserStoryStatus[]>) {
		statuses = e.detail;
	}
</script>

<svelte:head>
	<title>Board - TaigaLT</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b" style="border-color: var(--border-default); background-color: var(--bg-card);">
		<div>
			<h1 class="text-lg font-semibold" style="color: var(--text-primary);">{$currentProject?.name || 'Select a project'}</h1>
			<p class="text-sm" style="color: var(--text-muted);">Kanban Board</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				class="p-2 rounded-md transition-colors"
				style="color: var(--text-muted);"
				title="Toggle theme"
				on:click={toggleTheme}
			>
				{#if isDark}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
					</svg>
				{/if}
			</button>
			<button
				class="p-2 rounded-md transition-colors"
				style="color: var(--text-muted);"
				title="Configure columns"
				on:click={() => showConfigure = true}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
			<button class="btn-primary px-3 py-1.5 rounded-md text-sm font-medium transition-colors" on:click={() => openCreateModal()}>
				<svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Story
			</button>
		</div>
	</header>

	<!-- Board -->
	<div class="flex-1 overflow-hidden">
		{#if !$currentProject}
			<div class="flex items-center justify-center h-full">
				<div style="color: var(--text-muted);">Select a project to view the board</div>
			</div>
		{:else if isLoading}
			<div class="flex items-center justify-center h-full">
				<div style="color: var(--text-muted);">Loading board...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div style="color: #ef4444;">{error}</div>
			</div>
		{:else}
			<Board {statuses} {stories} {taskCounts} projectId={$currentProject.id} on:select={handleStorySelect} on:addToColumn={handleAddToColumn} />
		{/if}
	</div>
</div>

<!-- Issue Modal -->
{#if selectedStory}
	<IssueModal
		story={selectedStory}
		{statuses}
		{projectMembers}
		on:close={() => { selectedStory = null; goto('/board', { replaceState: true, noScroll: true }); }}
		on:update={handleStoryUpdate}
		on:delete={handleStoryDelete}
	/>
{/if}

<!-- Create Story Modal -->
{#if showCreateModal && $currentProject}
	<CreateStoryModal
		projectId={$currentProject.id}
		{statuses}
		defaultStatus={createDefaultStatus}
		on:close={() => showCreateModal = false}
		on:created={handleStoryCreated}
	/>
{/if}

<!-- Configure Board Modal -->
{#if showConfigure}
	<ConfigureBoardModal
		{statuses}
		projectId={$currentProject?.id ?? 0}
		on:close={() => showConfigure = false}
		on:update={handleStatusesUpdate}
	/>
{/if}