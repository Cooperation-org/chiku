<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);

		const accessToken = params.get('accessToken') || params.get('code');
		const refreshToken = params.get('refreshToken');

		if (!accessToken) {
			goto('/login');
			return;
		}

		auth.handleAuthSuccess(accessToken, refreshToken ?? undefined);

		if (typeof window !== 'undefined') {
			const handle = params.get('handle') ?? '';
			const blueskySession = {
				accessToken,
				refreshToken: refreshToken || undefined,
				handle
			};
			localStorage.setItem('atproto_session', JSON.stringify(blueskySession));
			auth.init();
		}

		goto('/');
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Completing sign in with Bluesky...</p>
	</div>
</div>