<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let handle: string = '';
	export let isLoadingBluesky: boolean = false;

	const dispatch = createEventDispatcher();

	function handleSubmit() {
		dispatch('submit');
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<div class="rounded-md p-3" style="background-color: var(--bg-hover); border: 1px solid var(--border-default);">
	<div class="mb-3">
		<label for="bluesky-handle" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
			Bluesky Handle
		</label>
		<input
			id="bluesky-handle"
			type="text"
			bind:value={handle}
			placeholder="your-handle.bsky.social"
			class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-1 text-base"
			style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-primary);"
			disabled={isLoadingBluesky}
			on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
		/>
	</div>
	<div class="flex gap-2">
		<button
			type="button"
			on:click={handleSubmit}
			disabled={isLoadingBluesky}
			class="flex-1 py-2 px-4 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			style="background-color: #0a7bf4; color: #ffffff;"
		>
			{isLoadingBluesky ? 'Connecting...' : 'Connect'}
		</button>
		<button
			type="button"
			on:click={handleCancel}
			disabled={isLoadingBluesky}
			class="py-2 px-4 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			style="background-color: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-secondary);"
		>
			Cancel
		</button>
	</div>
</div>