<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	onMount(() => {
		if (!browser) {
			return;
		}

		// Tokens arrive in the URL hash fragment as urlencoded key=value pairs.
		const hash = window.location.hash.startsWith('#')
			? window.location.hash.slice(1)
			: window.location.hash;
		const params = new URLSearchParams(hash);

		if (params.get('error') || !params.get('auth_token')) {
			goto('/login?error=sso_failed');
			return;
		}

		const ok = auth.setSession(params);
		if (ok) {
			goto('/');
		} else {
			goto('/login?error=sso_failed');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Signing you in…</p>
	</div>
</div>
