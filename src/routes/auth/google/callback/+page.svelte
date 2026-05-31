<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');

		if (!code) {
			goto('/login');
			return;
		}

		const result = await auth.loginWithGoogle(code);

		if (result.success) {
			goto('/');
		} else {
			goto('/login');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="text-center">
		<p style="color: var(--text-secondary);">Completing sign in with Google...</p>
	</div>
</div>