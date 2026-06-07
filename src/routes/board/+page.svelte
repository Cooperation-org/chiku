<script lang="ts">
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Board from '$lib/components/board/Board.svelte';
	import IssueModal from '$lib/components/IssueModal.svelte';
	import CreateStoryModal from '$lib/components/CreateStoryModal.svelte';
	import { currentProject } from '$lib/stores/project';
	import { getUserStories, getUserStoryStatuses } from '$lib/api/userstories';
	import { getProjectMemberships } from '$lib/api/memberships';
	import ColumnEditor from '$lib/components/ColumnEditor.svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';

	const queryClient = useQueryClient();

	// Modal state
	let selectedStory: UserStory | null = $state(null);
	let showCreateModal = false;
	let createDefaultStatus: number | null = $state(null);
	let showColumnEditor = false;

	// Stories query - wrap in accessor function for Svelte 5
	const storiesQuery = createQuery(() => ({
		queryKey: ['userstories', $currentProject?.id],
		queryFn: () => $currentProject ? getUserStories($currentProject.id) : [],
		enabled: !!$currentProject
	}));

	// Statuses query
	const statusesQuery = createQuery(() => ({
		queryKey: ['userstory-statuses', $currentProject?.id],
		queryFn: () => $currentProject ? getUserStoryStatuses($currentProject.id) : [],
		enabled: !!$currentProject
	}));

	// Memberships query
	const membershipsQuery = createQuery(() => ({
		queryKey: ['project-memberships', $currentProject?.id],
		queryFn: () => $currentProject ? getProjectMemberships($currentProject.id) : [],
		enabled: !!$currentProject
	}));

	// Derived values using $derived - access properties directly (TanStack Query handles lazy evaluation internally)
	let statuses = $derived(statusesQuery.data?.sort((a: UserStoryStatus, b: UserStoryStatus) => a.order - b.order) || []);
	let stories = $derived(storiesQuery.data || []);
	let projectMembers = $derived(membershipsQuery.data?.map((m: any) => ({
		id: m.user,
		full_name: m.full_name || '',
		full_name_display: m.full_name || '',
		email: '',
		username: m.full_name || 'user',
		photo: m.photo || null,
		big_photo: null,
		color: m.color || '#666'
	})) || []);

	let isLoading = $derived(storiesQuery.isLoading || statusesQuery.isLoading || membershipsQuery.isLoading);
	let error = $derived(storiesQuery.error?.message || '');

	// Handle URL story param
	let storyParam = $derived($page.url.searchParams.get('story'));
	$effect(() => {
		if (storyParam && stories.length > 0 && !selectedStory) {
			const storyRef = parseInt(storyParam);
			const found = stories.find((s: UserStory) => s.ref === storyRef);
			if (found) {
				selectedStory = found;
			}
		}
	});

	function handleStorySelect(e: CustomEvent<UserStory>) {
		selectedStory = e.detail;
		goto(`?story=${e.detail.ref}`, { replaceState: true, noScroll: true });
	}

	function handleStoryUpdate(e: CustomEvent<UserStory>) {
		const updated = e.detail;
		stories = stories.map((s: UserStory) => s.id === updated.id ? updated : s);
		selectedStory = updated;
	}

	function handleStoryDelete(e: CustomEvent<number>) {
		const deletedId = e.detail;
		stories = stories.filter((s: UserStory) => s.id !== deletedId);
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

	function handleColumnEditorUpdated() {
		queryClient.invalidateQueries({ queryKey: ['userstory-statuses'] });
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

{#if showColumnEditor && $currentProject}
	<ColumnEditor
		projectId={$currentProject.id}
		on:close={() => showColumnEditor = false}
		on:updated={handleColumnEditorUpdated}
	/>
{/if}
