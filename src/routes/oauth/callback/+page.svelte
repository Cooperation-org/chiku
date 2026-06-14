<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { verifyLinkedTrustState, linkedtrustRedirectUri } from '$lib/auth/linkedtrust';

	function fail(message: string) {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('oauth_error', message);
		}
		goto('/login');
	}

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const state = params.get('state');
		const errorParam = params.get('error');

		if (errorParam) {
			fail('LinkedTrust sign-in was cancelled or denied.');
			return;
		}
		if (!verifyLinkedTrustState(state)) {
			fail('LinkedTrust sign-in could not be verified. Please try again.');
			return;
		}
		if (!code) {
			fail('No authorization code received from LinkedTrust.');
			return;
		}

		const result = await auth.loginWithLinkedTrust(code, linkedtrustRedirectUri(window.location.origin));

		if (result.success) {
			goto('/');
		} else {
			fail(result.error || 'LinkedTrust sign-in failed. Please try again.');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Completing sign in with LinkedTrust...</p>
	</div>
</div>
