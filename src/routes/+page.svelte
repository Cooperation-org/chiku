<script lang="ts">
	import { goto } from '$app/navigation';
	import { currentProject } from '$lib/stores/project';

	// Redirect to board if project selected
	$: if ($currentProject) {
		goto(`/p/${$currentProject.slug}/board`);
	}
</script>

<svelte:head>
	<title>TaigaLT - LinkedTrust Project Management</title>
</svelte:head>

<div class="h-full flex items-center justify-center">
	<div class="text-center space-y-6 max-w-md">
		<img src="/logo.svg" alt="LinkedTrust" class="w-24 h-24 mx-auto" />
		<div>
			<h1 class="text-2xl font-bold text-zinc-100">TaigaLT</h1>
			<p class="text-zinc-400 mt-2">Fast, modern project management powered by Taiga</p>
		</div>

		<div class="bg-surface-2 rounded-lg border border-border p-4">
			<p class="text-zinc-400 text-sm">Select a project from the sidebar to get started</p>
		</div>

		<div class="pt-6 border-t border-border">
			<p class="text-xs text-zinc-500">
				Press <kbd class="kbd">⌘K</kbd> to open command palette
			</p>
		</div>
	</div>
</div>
