<script lang="ts">
	import type { UserStory } from '$lib/api/types';
	import Avatar from '../Avatar.svelte';

	export let story: UserStory;

	function formatDueDate(dateStr: string | null): { text: string; color: string } | null {
		if (!dateStr) return null;
		const due = new Date(dateStr + 'T00:00:00');
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		const month = due.toLocaleString('en', { month: 'short' });
		const text = `${month} ${due.getDate()}`;

		if (diffDays < 0) return { text, color: 'text-red-400' };
		if (diffDays <= 3) return { text, color: 'text-amber-400' };
		return { text, color: 'text-zinc-500' };
	}

	$: dueInfo = formatDueDate(story.due_date);
</script>

<div class="card group cursor-pointer animate-fade-in">
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
	<div class="flex items-start gap-2">
		<span class="text-xs text-zinc-500 font-mono shrink-0">#{story.ref}</span>
		<h4 class="text-sm text-zinc-200 leading-snug line-clamp-2">{story.subject}</h4>
	</div>

	<!-- Tags -->
	{#if story.tags && story.tags.length > 0}
		<div class="flex flex-wrap gap-1 mt-2">
			{#each story.tags.slice(0, 3) as [tag, color]}
				<span
					class="px-1.5 py-0.5 text-xs rounded bg-surface-3 text-zinc-400"
					style={color ? `background-color: ${color}30; color: ${color}` : ''}
				>
					{tag}
				</span>
			{/each}
			{#if story.tags.length > 3}
				<span class="px-1.5 py-0.5 text-xs text-zinc-500">+{story.tags.length - 3}</span>
			{/if}
		</div>
	{/if}

	<!-- Footer: points + assignee -->
	<div class="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
		<div class="flex items-center gap-2">
			<!-- Points -->
			{#if story.total_points !== null}
				<span class="text-xs font-medium text-lt-cyan">{story.total_points} pts</span>
			{/if}
			<!-- Due date -->
			{#if dueInfo}
				<span class="text-[10px] {dueInfo.color}">{dueInfo.text}</span>
			{/if}
		</div>

		<!-- Assignee -->
		{#if story.assigned_to_extra_info}
			<Avatar
				name={story.assigned_to_extra_info.full_name_display}
				photo={story.assigned_to_extra_info.photo}
				size="sm"
				class="bg-lt-teal/20 text-lt-teal"
			/>
		{:else}
			<div class="w-6 h-6 rounded-full bg-surface-3 text-zinc-600 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
				+
			</div>
		{/if}
	</div>
</div>
