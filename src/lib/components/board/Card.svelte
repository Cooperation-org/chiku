<script lang="ts">
	import type { UserStory } from '$lib/api/types';

	export let story: UserStory;
	export let taskCount: number = 0;

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

<div class="card group cursor-pointer animate-fade-in rounded-lg p-3 shadow-sm">
	<!-- Epic tag if present -->
	{#if story.epics && story.epics.length > 0}
		<div class="flex flex-wrap gap-1 mb-2">
			{#each story.epics as epic}
				<span
					class="px-1.5 py-0.5 text-xs rounded"
					style="background-color: {epic.color}20; color: {epic.color}"
				>
					{epic.subject}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Story ref and subject -->
	<div class="flex items-start gap-3 mb-2">
		<span class="text-[11px] font-mono shrink-0 mt-0.5" style="color: var(--text-muted);">#{story.ref}</span>
		<h4 class="text-sm font-medium leading-relaxed line-clamp-2" style="color: var(--text-primary);">{story.subject}</h4>
	</div>

	<!-- Tags -->
	{#if story.tags && story.tags.length > 0}
		<div class="flex flex-wrap gap-1 mt-2">
			{#each story.tags.slice(0, 3) as [tag, color]}
				<span
					class="px-1.5 py-0.5 text-xs rounded"
					style={color ? `background-color: ${color}20; color: ${color}` : `background-color: var(--bg-hover); color: var(--text-muted);`}
				>
					{tag}
				</span>
			{/each}
			{#if story.tags.length > 3}
				<span class="px-1.5 py-0.5 text-xs" style="color: var(--text-muted);">+{story.tags.length - 3}</span>
			{/if}
		</div>
	{/if}

	<!-- Footer: points + assignee -->
	<div class="flex items-center justify-between mt-3 pt-3 border-t" style="border-color: var(--border-default);">
		<div class="flex items-center gap-3">
			<!-- Points -->
			{#if story.total_points !== null}
				<span class="text-xs font-semibold tracking-wide" style="color: var(--accent);">{story.total_points} pts</span>
			{/if}
			<!-- Task count badge -->
			{#if taskCount > 0}
				<span class="text-xs flex items-center gap-1" style="color: var(--text-muted);">
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2"/>
						<path d="M9 12l2 2 4-4"/>
					</svg>
					{taskCount}
				</span>
			{/if}
			<!-- Last updated -->
			<span class="text-[11px]" style="color: var(--text-muted);">Updated {formatRelativeDate(story.modified_date)}</span>
		</div>

		<!-- Assignee -->
		{#if story.assigned_to_extra_info}
			<div
				class="w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center"
				style="background-color: rgb(0 178 229 / 0.2); color: var(--accent);"
				title={story.assigned_to_extra_info.full_name_display}
			>
				{getInitials(story.assigned_to_extra_info.full_name_display)}
			</div>
		{:else}
			<div
				class="w-7 h-7 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
				style="background-color: var(--bg-hover); color: var(--text-muted);"
			>
				+
			</div>
		{/if}
	</div>
</div>