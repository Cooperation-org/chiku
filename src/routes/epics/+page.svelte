<script lang="ts">
	import { currentProject } from '$lib/stores/project';
	import Avatar from '$lib/components/Avatar.svelte';
	import { getEpics, updateEpic } from '$lib/api/epics';
	import { api } from '$lib/api';
	import CreateEpicModal from '$lib/components/CreateEpicModal.svelte';
	import EpicModal from '$lib/components/EpicModal.svelte';
	import type { Epic } from '$lib/api/types';

	let epics: Epic[] = [];
	let isLoading = true;
	let error = '';

	// Modal state
	let showCreateModal = false;
	let selectedEpic: Epic | null = null;

	// Reload when project changes
	$: if ($currentProject) {
		loadData($currentProject.id);
	}
	// No project means nothing to load — don't sit on a loading message forever.
	$: if (!$currentProject) isLoading = false;

	async function loadData(projectId: number) {
		isLoading = true;
		error = '';
		try {
			epics = await getEpics(projectId);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load epics';
			console.error('Failed to load epics:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleEpicCreated(e: CustomEvent<Epic>) {
		epics = [...epics, e.detail];
		showCreateModal = false;
	}

	function handleEpicUpdate(e: CustomEvent<Epic>) {
		epics = epics.map(ep => ep.id === e.detail.id ? e.detail : ep);
		selectedEpic = e.detail;
	}

	function handleEpicDelete(e: CustomEvent<number>) {
		epics = epics.filter(ep => ep.id !== e.detail);
		selectedEpic = null;
	}

	function getProgress(epic: Epic): number {
		const counts = epic.user_stories_counts;
		if (!counts || counts.total === 0) return 0;
		return Math.round((counts.progress / counts.total) * 100);
	}

	function formatRelativeDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'today';
		if (diffDays === 1) return '1d';
		if (diffDays < 7) return `${diffDays}d`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
		return `${Math.floor(diffDays / 365)}y`;
	}
</script>

<svelte:head>
	<title>Epics - TaigaLT</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-border">
		<div>
			<h1 class="text-lg font-semibold text-zinc-100">{$currentProject?.name || 'Select a project'}</h1>
			<p class="text-sm text-zinc-500">Epics · {epics.length} total</p>
		</div>
		<div class="flex items-center gap-2">
			<button class="btn btn-primary" on:click={() => showCreateModal = true}>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Epic
			</button>
		</div>
	</header>

	<!-- Epics Grid -->
	<div class="flex-1 overflow-auto p-6">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Loading epics...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-red-400">{error}</div>
			</div>
		{:else if !$currentProject}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Select a project to view epics</div>
			</div>
		{:else if epics.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">No epics yet</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each epics as epic (epic.id)}
					<div class="bg-surface-2 rounded-lg border border-border hover:border-zinc-600 transition-colors cursor-pointer group" on:click={() => selectedEpic = epic}>
						<!-- Epic header with color bar -->
						<div class="h-1 rounded-t-lg" style="background-color: {epic.color}"></div>

						<div class="p-4">
							<!-- Ref and status -->
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									<span class="text-zinc-500 text-sm">#{epic.ref}</span>
									<span class="text-zinc-600 text-xs">{formatRelativeDate(epic.modified_date)}</span>
								</div>
								<span
									class="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
									style="background-color: {epic.status_extra_info.color}20; color: {epic.status_extra_info.color}"
								>
									{epic.status_extra_info.name}
								</span>
							</div>

							<!-- Title -->
							<h3 class="text-zinc-100 font-medium mb-1 group-hover:text-lt-cyan transition-colors">
								{epic.subject}
							</h3>
							{#if epic.description}
								<p class="text-zinc-500 text-sm mb-4 line-clamp-2">{epic.description}</p>
							{:else}
								<p class="text-zinc-600 text-sm mb-4 italic">No description</p>
							{/if}

							<!-- Progress bar -->
							<div class="mb-3">
								<div class="flex items-center justify-between text-xs mb-1">
									<span class="text-zinc-500">Progress</span>
									<span class="text-zinc-400">{getProgress(epic)}%</span>
								</div>
								<div class="h-1.5 bg-surface-3 rounded-full overflow-hidden">
									<div
										class="h-full rounded-full transition-all duration-300"
										style="width: {getProgress(epic)}%; background-color: {epic.color}"
									></div>
								</div>
							</div>

							<!-- Stats -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3">
									<span class="text-zinc-500">
										<span class="text-zinc-300">{epic.user_stories_counts?.progress || 0}</span>/{epic.user_stories_counts?.total || 0} stories
									</span>
								</div>
								{#if epic.assigned_to_extra_info}
									<Avatar
										name={epic.assigned_to_extra_info.full_name_display || epic.assigned_to_extra_info.full_name}
										photo={epic.assigned_to_extra_info.photo}
										size="sm"
										class="bg-lt-teal/20 text-lt-teal"
									/>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create Epic Modal -->
{#if showCreateModal && $currentProject}
	<CreateEpicModal
		projectId={$currentProject.id}
		on:close={() => showCreateModal = false}
		on:created={handleEpicCreated}
	/>
{/if}

<!-- Epic Detail Modal -->
{#if selectedEpic}
	<EpicModal
		epic={selectedEpic}
		on:close={() => selectedEpic = null}
		on:update={handleEpicUpdate}
		on:delete={handleEpicDelete}
	/>
{/if}
