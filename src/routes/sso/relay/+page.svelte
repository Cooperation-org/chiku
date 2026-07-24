<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { saveRelayTarget } from '$lib/auth/relayTarget';

	// SSO relay: a partner app (e.g. the workers.vc sign-in cascade) sends the
	// browser here with ?next=<its own URL>. We sign the member in via
	// LinkedTrust and then bounce straight back to that URL — so one login covers
	// every team app. The ?next is accepted only if it is on the allowlist
	// (relayTarget.ts / VITE_SSO_RELAY_ORIGINS); anything else is refused and the
	// member simply lands on Marten.
	onMount(() => {
		const next = new URLSearchParams(window.location.search).get('next');
		if (!saveRelayTarget(next)) {
			goto('/', { replaceState: true });
			return;
		}
		// Kick off LinkedTrust login. A durable LinkedTrust session completes this
		// silently; the callback then reads the saved target and returns there.
		const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
		window.location.href = `${apiBase}/auth/linkedtrust/redirect`;
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Signing you in with LinkedTrust&hellip;</p>
	</div>
</div>
