<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { currentProject } from '$lib/stores/project';
	import { getAllUserStories } from '$lib/api/userstories';
	import { getProjects, isArchived } from '$lib/api/projects';
	import type { UserStory, Project } from '$lib/api/types';

	let stories: UserStory[] = [];
	let projects: Project[] = [];
	let isLoading = true;
	let error = '';

	// Filters
	let filterUserId: number | string = '';
	let filterProjectId: number | string = '';
	let showClosed = false;

	// Collect unique users from loaded stories
	$: allUsers = (() => {
		const map = new Map<number, { id: number; name: string }>();
		for (const s of stories) {
			if (s.assigned_to != null && s.assigned_to_extra_info) {
				map.set(s.assigned_to, { id: s.assigned_to, name: s.assigned_to_extra_info.full_name_display || s.assigned_to_extra_info.full_name });
			}
			if (s.owner_extra_info) {
				map.set(s.owner, { id: s.owner, name: s.owner_extra_info.full_name_display || s.owner_extra_info.full_name });
			}
		}
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
	})();

	$: filteredStories = stories.filter(s => {
		if (filterUserId && s.assigned_to !== Number(filterUserId)) return false;
		if (filterProjectId && s.project !== Number(filterProjectId)) return false;
		if (!showClosed && s.is_closed) return false;
		return true;
	});

	// Set "me" as default filter
	$: if ($auth.user && filterUserId === '' && stories.length > 0) {
		filterUserId = $auth.user.id;
	}

	onMount(async () => {
		try {
			const [storiesData, projectsData] = await Promise.all([
				getAllUserStories(),
				getProjects()
			]);
			stories = storiesData;
			projects = projectsData.filter(p => !isArchived(p));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load';
			console.error(err);
		} finally {
			isLoading = false;
		}
	});

	function formatDue(dateStr: string | null): { text: string; color: string } | null {
		if (!dateStr) return null;
		const due = new Date(dateStr + 'T00:00:00');
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
		const text = due.toLocaleDateString('en', { month: 'short', day: 'numeric' });
		if (diff < 0) return { text, color: 'text-red-400' };
		if (diff <= 3) return { text, color: 'text-amber-400' };
		return { text, color: 'text-zinc-500' };
	}

	function openStory(story: UserStory) {
		const slug = story.project_extra_info?.slug;
		if (slug) {
			goto(`/p/${slug}/board?story=${story.ref}`);
		}
	}
</script>

<svelte:head>
	<title>My Tasks - TaigaLT</title>
</svelte:head>

<div class="h-full flex flex-col">
	<header class="flex items-center justify-between px-6 py-4 border-b border-border">
		<h1 class="text-lg font-semibold text-zinc-100">Tasks</h1>
		<div class="flex items-center gap-3">
			<!-- User filter -->
			<select
				bind:value={filterUserId}
				class="px-2 py-1.5 text-sm bg-surface-2 border border-border rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
			>
				<option value="">All users</option>
				{#each allUsers as user}
					<option value={user.id}>{user.name}</option>
				{/each}
			</select>

			<!-- Project filter -->
			<select
				bind:value={filterProjectId}
				class="px-2 py-1.5 text-sm bg-surface-2 border border-border rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
			>
				<option value="">All projects</option>
				{#each projects as p}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>

			<!-- Show closed toggle -->
			<label class="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
				<input type="checkbox" bind:checked={showClosed} class="rounded border-border bg-surface-2" />
				Closed
			</label>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Loading tasks...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-red-400">{error}</div>
			</div>
		{:else if filteredStories.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">No tasks found</div>
			</div>
		{:else}
			<table class="w-full">
				<thead class="sticky top-0 bg-surface-1 border-b border-border">
					<tr class="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
						<th class="px-6 py-3">Story</th>
						<th class="px-4 py-3">Project</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Assigned</th>
						<th class="px-4 py-3">Due</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredStories as story (story.id)}
						<tr
							class="hover:bg-surface-2 cursor-pointer transition-colors"
							on:click={() => openStory(story)}
						>
							<td class="px-6 py-3">
								<div class="flex items-center gap-2">
									<span class="text-xs font-mono text-zinc-500">#{story.ref}</span>
									<span class="text-sm text-zinc-200 truncate max-w-md">{story.subject}</span>
								</div>
							</td>
							<td class="px-4 py-3">
								<span class="text-xs text-zinc-400">{story.project_extra_info?.name || ''}</span>
							</td>
							<td class="px-4 py-3">
								{#if story.status_extra_info}
									<span
										class="px-2 py-0.5 text-xs rounded font-medium"
										style="background-color: {story.status_extra_info.color}30; color: {story.status_extra_info.color}"
									>{story.status_extra_info.name}</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span class="text-xs text-zinc-400">
									{story.assigned_to_extra_info?.full_name_display || 'Unassigned'}
								</span>
							</td>
							<td class="px-4 py-3">
								{#if story.due_date}
									{@const due = formatDue(story.due_date)}
									{#if due}
										<span class="text-xs font-medium {due.color}">{due.text}</span>
									{/if}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="px-6 py-2 border-t border-border text-xs text-zinc-500">
		{filteredStories.length} task{filteredStories.length !== 1 ? 's' : ''}
	</div>
</div>
