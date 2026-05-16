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
	<header class="flex items-center justify-between px-6 py-4 border-b border-border">
		<div>
			<h1 class="text-lg font-semibold text-zinc-100">{$currentProject?.name || 'Select a project'}</h1>
			<p class="text-sm text-zinc-500">Kanban Board</p>
		</div>
		<div class="flex items-center gap-2">
			<button class="btn btn-ghost" title="Configure columns" on:click={() => showConfigure = true}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
			<button class="btn btn-primary" on:click={() => openCreateModal()}>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<div class="text-zinc-500">Select a project to view the board</div>
			</div>
		{:else if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Loading board...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-red-400">{error}</div>
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
