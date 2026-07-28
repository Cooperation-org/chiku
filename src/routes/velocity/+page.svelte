<script lang="ts">
	import { currentProject } from '$lib/stores/project';
	import { getMilestones } from '$lib/api/milestones';
	import { getUserStories } from '$lib/api/userstories';
	import type { Milestone } from '$lib/api/types';

	let milestones: Milestone[] = [];
	let isLoading = true;
	let error = '';
	let backlogPoints = 0;

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
			const [milestonesData, stories] = await Promise.all([
				getMilestones(projectId),
				getUserStories(projectId)
			]);
			milestones = milestonesData.sort((a, b) =>
				new Date(a.estimated_start).getTime() - new Date(b.estimated_start).getTime()
			);
			// Calculate remaining backlog points (stories not in any milestone and not closed)
			backlogPoints = stories
				.filter(s => !s.milestone && !s.is_closed)
				.reduce((sum, s) => sum + (s.total_points || 0), 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load velocity data';
			console.error('Failed to load velocity:', err);
		} finally {
			isLoading = false;
		}
	}

	// Calculate velocity from completed milestones
	$: completedMilestones = milestones.filter(m => m.closed);
	$: velocities = completedMilestones.map(m => m.closed_points);
	$: avgVelocity = velocities.length > 0
		? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
		: 0;
	$: maxVelocity = Math.max(...velocities, 1);
	$: sprintsRemaining = avgVelocity > 0 ? Math.ceil(backlogPoints / avgVelocity) : 0;

	// Current sprint
	$: currentMilestone = milestones.find(m => !m.closed);
	$: currentProgress = currentMilestone
		? Math.round((currentMilestone.closed_points / (currentMilestone.total_points || 1)) * 100)
		: 0;
</script>

<svelte:head>
	<title>Velocity - TaigaLT</title>
</svelte:head>

<div class="h-full flex flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-border">
		<div>
			<h1 class="text-lg font-semibold text-zinc-100">{$currentProject?.name || 'Select a project'}</h1>
			<p class="text-sm text-zinc-500">Velocity & Burndown</p>
		</div>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-auto p-6">
		{#if isLoading}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Loading velocity data...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full">
				<div class="text-red-400">{error}</div>
			</div>
		{:else if !$currentProject}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">Select a project to view velocity</div>
			</div>
		{:else if milestones.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-zinc-500">No sprints yet. Create a sprint to track velocity.</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

				<!-- Velocity Stats -->
				<div class="bg-surface-2 rounded-lg border border-border p-6">
					<h2 class="text-zinc-100 font-medium mb-4">Velocity Overview</h2>

					<div class="grid grid-cols-3 gap-4 mb-6">
						<div class="bg-surface-3 rounded-lg p-4">
							<div class="text-2xl font-bold text-lt-cyan">{avgVelocity}</div>
							<div class="text-sm text-zinc-500">Avg Velocity</div>
						</div>
						<div class="bg-surface-3 rounded-lg p-4">
							<div class="text-2xl font-bold text-lt-gold">{backlogPoints}</div>
							<div class="text-sm text-zinc-500">Backlog Points</div>
						</div>
						<div class="bg-surface-3 rounded-lg p-4">
							<div class="text-2xl font-bold text-lt-green">{sprintsRemaining}</div>
							<div class="text-sm text-zinc-500">Sprints Left</div>
						</div>
					</div>

					<!-- Velocity Chart (bar chart) -->
					<div class="space-y-2">
						{#each milestones as milestone (milestone.id)}
							<div class="flex items-center gap-3">
								<div class="w-24 text-sm text-zinc-500 truncate" title={milestone.name}>{milestone.name}</div>
								<div class="flex-1 h-6 bg-surface-3 rounded overflow-hidden">
									<div
										class="h-full rounded transition-all duration-300"
										class:bg-lt-cyan={milestone.closed}
										class:bg-lt-gold={!milestone.closed}
										style="width: {(milestone.closed_points / maxVelocity) * 100}%"
									></div>
								</div>
								<div class="w-12 text-sm text-zinc-400 text-right">{milestone.closed_points}/{milestone.total_points}</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Current Sprint -->
				<div class="bg-surface-2 rounded-lg border border-border p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-zinc-100 font-medium">Current Sprint</h2>
						{#if currentMilestone}
							<span class="text-sm text-zinc-500">{currentMilestone.name}</span>
						{/if}
					</div>

					{#if currentMilestone}
						<!-- Progress bar -->
						<div class="mb-6">
							<div class="flex items-center justify-between text-sm mb-2">
								<span class="text-zinc-500">{currentMilestone.closed_points} / {currentMilestone.total_points} points</span>
								<span class="text-zinc-400">{currentProgress}%</span>
							</div>
							<div class="h-2 bg-surface-3 rounded-full overflow-hidden">
								<div
									class="h-full bg-lt-cyan rounded-full transition-all duration-300"
									style="width: {currentProgress}%"
								></div>
							</div>
						</div>

						<!-- Sprint dates -->
						<div class="text-sm text-zinc-500 space-y-1">
							<div>Start: <span class="text-zinc-400">{currentMilestone.estimated_start}</span></div>
							<div>End: <span class="text-zinc-400">{currentMilestone.estimated_finish}</span></div>
						</div>
					{:else}
						<div class="text-zinc-500 text-center py-8">No active sprint</div>
					{/if}
				</div>

				<!-- Projection -->
				<div class="bg-surface-2 rounded-lg border border-border p-6 lg:col-span-2">
					<h2 class="text-zinc-100 font-medium mb-4">Completion Projection</h2>

					{#if avgVelocity > 0}
						<div class="flex items-center gap-8">
							<div class="flex-1">
								<p class="text-zinc-400 mb-4">
									At your current average velocity of <span class="text-lt-cyan font-medium">{avgVelocity} points/sprint</span>,
									you will complete the remaining <span class="text-lt-gold font-medium">{backlogPoints} backlog points</span>
									in approximately <span class="text-lt-green font-medium">{sprintsRemaining} sprints</span>.
								</p>

								<!-- Visual timeline -->
								<div class="flex items-center gap-1">
									{#each Array(Math.min(sprintsRemaining + completedMilestones.length, 20)) as _, i}
										<div
											class="h-8 flex-1 rounded transition-colors"
											class:bg-lt-cyan={i < completedMilestones.length}
											class:bg-lt-gold={i === completedMilestones.length}
											class:bg-surface-3={i > completedMilestones.length}
											title={i < completedMilestones.length ? `Sprint ${i + 1} (completed)` : i === completedMilestones.length ? 'Current sprint' : `Sprint ${i + 1} (projected)`}
										></div>
									{/each}
								</div>
								<div class="flex justify-between text-xs text-zinc-500 mt-2">
									<span>Sprint 1</span>
									<span>Sprint {Math.min(sprintsRemaining + completedMilestones.length, 20)}{sprintsRemaining + completedMilestones.length > 20 ? '+' : ''}</span>
								</div>
							</div>
						</div>
					{:else}
						<p class="text-zinc-500">Complete at least one sprint to see projections.</p>
					{/if}
				</div>

			</div>
		{/if}
	</div>
</div>
