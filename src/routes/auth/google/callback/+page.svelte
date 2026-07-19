<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { consumeReturnTo } from '$lib/auth/returnTo';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const errorParam = params.get('error');

		if (errorParam) {
			// User cancelled or OAuth error - redirect with error message
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('oauth_error', `Google sign-in was cancelled or denied.`);
			}
			goto('/login');
			return;
		}

		if (!code) {
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('oauth_error', 'No authorization code received from Google.');
			}
			goto('/login');
			return;
		}

		const result = await auth.loginWithGoogle(code);

		if (result.success) {
			goto(consumeReturnTo() ?? '/', { replaceState: true });
		} else {
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('oauth_error', result.error || 'Google sign-in failed. Please try again.');
			}
			goto('/login');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Completing sign in with Google...</p>
	</div>
</div>