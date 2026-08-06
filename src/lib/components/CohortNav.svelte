<script lang="ts">
	// The cohort's cross-app bar, the same one workers.vc and GovKit mount, so a
	// person who reaches the board from the dash can get back out of it.
	// The script is served by the app that owns it (workers.vc); Marten only
	// says where to find it. Unset VITE_COHORT_NAV_SRC (the default) mounts
	// nothing, which is what a standalone Marten wants.
	import { onMount } from 'svelte';

	export let org: string | null = null;

	const src = import.meta.env.VITE_COHORT_NAV_SRC as string | undefined;

	onMount(() => {
		if (!src || document.querySelector('script[data-cohort-nav]')) return;
		const s = document.createElement('script');
		s.src = src;
		s.defer = true;
		s.dataset.cohortNav = '';
		document.head.appendChild(s);
	});
</script>

{#if src}
	{#key org}
		<cohort-nav data-org={org || undefined} data-current="board"></cohort-nav>
	{/key}
{/if}
