<script lang="ts">
	// The cohort's cross-app bar, the same one workers.vc, GovKit, amebo and elm
	// mount, so a person who reaches the board from the dash can get back out of
	// it. The script is served by the app that owns it (workers.vc); Marten only
	// says where to find it.
	//
	// VITE_COHORT_NAV_SRC pins that address. Unset, the address is derived from
	// the page's own registrable domain — marten.workers.vc asks workers.vc —
	// and a deployment that has no such bundle drops the element when the script
	// fails to load, so a standalone Marten shows nothing.
	import { onMount } from 'svelte';

	export let org: string | null = null;

	const pinned = import.meta.env.VITE_COHORT_NAV_SRC as string | undefined;
	let mounted = true;

	function fromHost(): string {
		const host = location.hostname.split('.').slice(-2).join('.');
		return host ? `https://${host}/static/embed/cohort-nav.js` : '';
	}

	onMount(() => {
		if (document.querySelector('script[data-cohort-nav]')) return;
		const src = pinned || fromHost();
		if (!src) {
			mounted = false;
			return;
		}
		const s = document.createElement('script');
		s.src = src;
		s.defer = true;
		s.dataset.cohortNav = '';
		s.onerror = () => { mounted = false; };
		document.head.appendChild(s);
	});
</script>

{#if mounted}
	{#key org}
		<cohort-nav data-org={org || undefined} data-current="board"></cohort-nav>
	{/key}
{/if}
