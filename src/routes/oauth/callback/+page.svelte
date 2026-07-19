<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { consumeReturnTo } from '$lib/auth/returnTo';

	function fail(message: string) {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('oauth_error', message);
		}
		goto('/login');
	}

	onMount(async () => {
		// Check for error in query params (backend redirects here on failure)
		const queryError = new URLSearchParams(window.location.search).get('error');
		if (queryError) {
			const messages: Record<string, string> = {
				pending_approval: 'Your account is pending approval.',
				auth_failed: 'Sign-in failed. Please try again.',
				expired: 'The sign-in request expired. Please try again.',
				state_mismatch: 'Sign-in could not be verified. Please try again.',
				no_email: 'That account has no email address.',
			};
			fail(messages[queryError] || 'Sign-in error. Please try again.');
			return;
		}

		// Tokens arrive in the URL fragment (server-side flow)
		const hash = window.location.hash.startsWith('#')
			? window.location.hash.slice(1)
			: '';
		const params = new URLSearchParams(hash);
		const authToken = params.get('auth_token');
		const refresh = params.get('refresh');

		if (authToken) {
			// Strip fragment from URL/history before continuing
			window.history.replaceState(null, '', window.location.pathname);

			auth.handleAuthSuccess(authToken, refresh || undefined, {
				auth_token: authToken,
				refresh: refresh || undefined
			} as any);

			// Return to the deep-linked page saved before the OIDC hop, if any
			goto(consumeReturnTo() ?? '/', { replaceState: true });
		} else {
			fail('LinkedTrust sign-in failed. Please try again.');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Completing sign in with LinkedTrust...</p>
	</div>
</div>
