<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentProject } from '$lib/stores/project';
	import { getUserStories, getUserStoryStatuses } from '$lib/api/userstories';
	import { getProjectMemberships } from '$lib/api/memberships';
	import CreateStoryModal from '$lib/components/CreateStoryModal.svelte';
	import IssueModal from '$lib/components/IssueModal.svelte';
	import type { UserStory, UserStoryStatus, User } from '$lib/api/types';

	let stories: UserStory[] = [];
	let statuses: UserStoryStatus[] = [];
	let projectMembers: User[] = [];
	let isLoading = true;
	let error = '';

	// Modal state
	let showCreateModal = false;
	let selectedStory: UserStory | null = null;

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
			const [storiesData, statusesData, membershipsData] = await Promise.all([
				getUserStories(projectId),
				getUserStoryStatuses(projectId),
				getProjectMemberships(projectId)
			]);
			// Sort by backlog order
			stories = storiesData.sort((a, b) => a.backlog_order - b.backlog_order);
			statuses = statusesData;
			// Map memberships to User format for assignee dropdown
			projectMembers = membershipsData.map(m => ({
				id: m.user,
				full_name: m.full_name,
				username: m.full_name || 'user',
				photo: m.photo,
				color: m.color
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load backlog';
			console.error('Failed to load backlog:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleStoryCreated(e: CustomEvent<UserStory>) {
		stories = [...stories, e.detail].sort((a, b) => a.backlog_order - b.backlog_order);
		showCreateModal = false;
	}

	function handleStoryUpdate(e: CustomEvent<UserStory>) {
		stories = stories.map(s => s.id === e.detail.id ? e.detail : s);
		selectedStory = e.detail;
	}

	function handleStoryDelete(e: CustomEvent<number>) {
		stories = stories.filter(s => s.id !== e.detail);
		selectedStory = null;
	}

	// Calculate totals
	$: openStories = stories.filter(s => !s.is_closed);
	$: totalPoints = stories.reduce((sum, s) => sum + (s.total_points || 0), 0);
	$: openPoints = openStories.reduce((sum, s) => sum + (s.total_points || 0), 0);

	function getInitials(name: string): string {
		return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
	<title>Backlog - TaigaLT</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-border">
		<div>
			<h1 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{$currentProject?.name || 'Select a project'}</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-500">Backlog · {openStories.length} stories · {openPoints} points</p>
		</div>
		<div class="flex items-center gap-2">
			<button class="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-surface-3 rounded-md transition-colors" title="Toggle theme" on:click={toggleTheme}>
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
			<button class="btn btn-primary" on:click={() => showCreateModal = true}>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Story
			</button>
		</div>
	</header>

	<!-- Backlog List -->
	<div class="flex-1 overflow-auto">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Loading backlog...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-red-400">{error}</div>
			</div>
		{:else if !$currentProject}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Select a project to view the backlog</div>
			</div>
		{:else if stories.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">No stories in backlog</div>
			</div>
		{:else}
			<table class="w-full">
				<thead class="sticky top-0 bg-surface-1 border-b border-border">
					<tr class="text-left text-xs text-zinc-500 uppercase tracking-wider">
						<th class="px-6 py-3 w-16">Ref</th>
						<th class="px-6 py-3">Story</th>
						<th class="px-6 py-3 w-32">Status</th>
						<th class="px-6 py-3 w-32">Assignee</th>
						<th class="px-6 py-3 w-16 text-right">Points</th>
						<th class="px-6 py-3 w-16 text-right">Updated</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each stories as story (story.id)}
						<tr class="hover:bg-surface-2 transition-colors cursor-pointer group" on:click={() => { selectedStory = story; goto(`?story=${story.ref}`, { replaceState: true, noScroll: true }); }}>
							<td class="px-6 py-3">
								<span class="text-zinc-500 text-sm">#{story.ref}</span>
							</td>
							<td class="px-6 py-3">
								<div class="flex flex-col gap-1">
									<span class="text-zinc-100 group-hover:text-lt-cyan transition-colors">{story.subject}</span>
									<div class="flex items-center gap-2">
										{#if story.epics}
											{#each story.epics as epic}
												<span
													class="text-xs px-1.5 py-0.5 rounded"
													style="background-color: {epic.color}20; color: {epic.color}"
												>
													{epic.subject}
												</span>
											{/each}
										{/if}
										{#if story.tags}
											{#each story.tags as [tag, color]}
												<span
													class="text-xs px-1.5 py-0.5 rounded"
													style="background-color: {color || '#666'}20; color: {color || '#999'}"
												>
													{tag}
												</span>
											{/each}
										{/if}
									</div>
								</div>
							</td>
							<td class="px-6 py-3">
								<span
									class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
									style="background-color: {story.status_extra_info.color}20; color: {story.status_extra_info.color}"
								>
									<span class="w-1.5 h-1.5 rounded-full" style="background-color: {story.status_extra_info.color}"></span>
									{story.status_extra_info.name}
								</span>
							</td>
							<td class="px-6 py-3">
								{#if story.assigned_to_extra_info}
									<div class="flex items-center gap-2">
										<div
											class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
											style="background-color: {story.assigned_to_extra_info.color}"
										>
											{getInitials(story.assigned_to_extra_info.full_name)}
										</div>
										<span class="text-sm text-zinc-400">{story.assigned_to_extra_info.full_name.split(' ')[0]}</span>
									</div>
								{:else}
									<span class="text-zinc-600 text-sm">Unassigned</span>
								{/if}
							</td>
							<td class="px-6 py-3 text-right">
								<span class="text-zinc-100 font-medium">{story.total_points || '-'}</span>
							</td>
							<td class="px-6 py-3 text-right">
								<span class="text-zinc-500 text-xs">{formatRelativeDate(story.modified_date)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Footer summary -->
	{#if !isLoading && !error && stories.length > 0}
		<footer class="px-6 py-3 border-t border-border bg-surface-1 flex items-center justify-between text-sm">
			<span class="text-zinc-500">{stories.length} total stories</span>
			<span class="text-zinc-400">Total: <span class="text-zinc-100 font-medium">{totalPoints} points</span></span>
		</footer>
	{/if}
</div>

<!-- Create Story Modal -->
{#if showCreateModal && $currentProject}
	<CreateStoryModal
		projectId={$currentProject.id}
		{statuses}
		on:close={() => showCreateModal = false}
		on:created={handleStoryCreated}
	/>
{/if}

<!-- Issue Modal -->
{#if selectedStory}
	<IssueModal
		story={selectedStory}
		{statuses}
		{projectMembers}
		on:close={() => { selectedStory = null; goto('/backlog', { replaceState: true, noScroll: true }); }}
		on:update={handleStoryUpdate}
		on:delete={handleStoryDelete}
	/>
{/if}
