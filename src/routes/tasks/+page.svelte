<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { getAllUserStoriesPaged } from '$lib/api/userstories';
	import { getProjects, isArchived } from '$lib/api/projects';
	import {
		EMPTY_FILTER,
		UNASSIGNED,
		collectPeople,
		collectStatuses,
		collectTags,
		filterFromParams,
		filterStories,
		filterToParams,
		isEmptyFilter,
		paramsHaveFilter,
		type StoryFilter
	} from '$lib/filters/stories';
	import type { UserStory, Project } from '$lib/api/types';

	let stories: UserStory[] = [];
	let projects: Project[] = [];
	let isLoading = true;
	let loadedEverything = true;
	let error = '';
	let searchInput: HTMLInputElement;

	let filter: StoryFilter = { ...EMPTY_FILTER };
	/** Set once the URL has been read, so we don't write it back before then. */
	let ready = false;

	$: ({ assignees, creators } = collectPeople(stories));
	$: statuses = collectStatuses(stories);
	$: availableTags = collectTags(stories);
	$: visible = filterStories(stories, filter);
	$: hasFilter = !isEmptyFilter(filter);

	// Keep the URL in step with the filter: a filtered view is a shareable link.
	$: if (ready) syncUrl(filter);

	let urlTimer: ReturnType<typeof setTimeout>;
	function syncUrl(f: StoryFilter) {
		clearTimeout(urlTimer);
		const qs = filterToParams(f).toString();
		urlTimer = setTimeout(() => {
			const target = qs ? `/tasks?${qs}` : '/tasks';
			if (target !== location.pathname + location.search) {
				goto(target, { replaceState: true, keepFocus: true, noScroll: true });
			}
		}, 200);
	}

	function toggleTag(tag: string) {
		filter = filter.tags.includes(tag)
			? { ...filter, tags: filter.tags.filter(t => t !== tag) }
			: { ...filter, tags: [...filter.tags, tag] };
	}

	function clearFilters() {
		filter = { ...EMPTY_FILTER, showClosed: filter.showClosed };
	}

	function onKeydown(e: KeyboardEvent) {
		const el = e.target as HTMLElement | null;
		const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
		if (e.key === '/' && !typing) {
			e.preventDefault();
			searchInput?.focus();
		} else if (e.key === 'Escape' && el === searchInput) {
			filter = { ...filter, q: '' };
		}
	}

	onMount(async () => {
		const params = $page.url.searchParams;
		filter = filterFromParams(params);
		const urlHadFilter = paramsHaveFilter(params);

		try {
			const [storyResult, projectsData] = await Promise.all([
				getAllUserStoriesPaged(),
				getProjects()
			]);
			stories = storyResult.stories;
			loadedEverything = storyResult.complete;
			projects = projectsData.filter(p => !isArchived(p));
			// "My tasks" stays the default landing view, but never overrides a link.
			if (!urlHadFilter && $auth.user) {
				filter = { ...filter, assignee: $auth.user.id };
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load';
			console.error(err);
		} finally {
			isLoading = false;
			ready = true;
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

	const selectClass =
		'px-2 py-1.5 text-sm bg-surface-2 border border-border rounded text-zinc-200 focus:outline-none focus:ring-1 focus:ring-lt-cyan';
</script>

<svelte:head>
	<title>Tasks - TaigaLT</title>
</svelte:head>

<svelte:window on:keydown={onKeydown} />

<div class="h-full flex flex-col">
	<header class="px-6 py-4 border-b border-border space-y-3">
		<div class="flex items-center gap-3">
			<h1 class="text-lg font-semibold text-zinc-100 shrink-0">Tasks</h1>

			<div class="relative flex-1 max-w-xl">
				<input
					bind:this={searchInput}
					bind:value={filter.q}
					type="search"
					placeholder="Search tasks — title, description, tag, person, #ref"
					class="w-full pl-3 pr-12 py-1.5 text-sm bg-surface-2 border border-border rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-lt-cyan"
				/>
				{#if !filter.q}
					<kbd
						class="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] text-zinc-500 border border-border rounded"
						>/</kbd
					>
				{/if}
			</div>

			<label class="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer shrink-0">
				<input type="checkbox" bind:checked={filter.showClosed} class="rounded border-border bg-surface-2" />
				Closed
			</label>

			{#if hasFilter}
				<button
					type="button"
					on:click={clearFilters}
					class="shrink-0 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 border border-border rounded hover:bg-surface-2"
				>
					Clear filters
				</button>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<select bind:value={filter.assignee} class={selectClass} aria-label="Assignee">
				<option value={null}>Anyone assigned</option>
				<option value={UNASSIGNED}>Unassigned</option>
				{#each assignees as person}
					<option value={person.id}>{person.name}</option>
				{/each}
			</select>

			<select bind:value={filter.creator} class={selectClass} aria-label="Created by">
				<option value={null}>Any creator</option>
				{#each creators as person}
					<option value={person.id}>{person.name}</option>
				{/each}
			</select>

			<select bind:value={filter.project} class={selectClass} aria-label="Project">
				<option value={null}>All projects</option>
				{#each projects as p}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>

			<select bind:value={filter.status} class={selectClass} aria-label="Status">
				<option value="">Any status</option>
				{#each statuses as name}
					<option value={name}>{name}</option>
				{/each}
			</select>

			<div class="flex items-center gap-1.5 text-sm text-zinc-400">
				<span>Due</span>
				<input type="date" bind:value={filter.dueFrom} aria-label="Due from" class={selectClass} />
				<span>to</span>
				<input type="date" bind:value={filter.dueTo} aria-label="Due to" class={selectClass} />
			</div>
		</div>

		{#if availableTags.length > 0}
			<div class="flex flex-wrap items-center gap-1.5">
				{#each availableTags as tag}
					<button
						type="button"
						on:click={() => toggleTag(tag)}
						aria-pressed={filter.tags.includes(tag)}
						class="px-2 py-0.5 text-xs rounded-full border transition-colors {filter.tags.includes(tag)
							? 'bg-lt-cyan/20 border-lt-cyan text-lt-cyan'
							: 'border-border text-zinc-400 hover:text-zinc-200 hover:bg-surface-2'}"
					>
						{tag}
					</button>
				{/each}
			</div>
		{/if}
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
		{:else if visible.length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-3">
				<div class="text-zinc-500">
					{hasFilter ? 'No tasks match these filters' : 'No tasks found'}
				</div>
				{#if hasFilter}
					<button
						type="button"
						on:click={clearFilters}
						class="px-3 py-1.5 text-sm text-zinc-300 border border-border rounded hover:bg-surface-2"
					>
						Clear filters
					</button>
				{/if}
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
					{#each visible as story (story.id)}
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
										>{story.status_extra_info.name}</span
									>
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
		{visible.length} of {stories.length} task{stories.length !== 1 ? 's' : ''}
		{#if !loadedEverything}
			<span class="text-amber-400">— too many to load; showing the most recent {stories.length}</span>
		{/if}
	</div>
</div>
