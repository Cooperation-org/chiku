<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api/client';
	import type { AuthResponse } from '$lib/api/types';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');

		if (!code) {
			goto('/login');
			return;
		}

		try {
			const response = await api.post<AuthResponse>('/auth', {
				type: 'github',
				code
			});

			api.setToken(response.auth_token);
			api.setRefreshToken(response.refresh);
			localStorage.setItem('taiga_user', JSON.stringify(response));
			goto('/');
		} catch (err) {
			console.error('GitHub auth failed:', err);
			goto('/login');
		}
	});
</script>

<div class="min-h-screen bg-surface-0 flex items-center justify-center p-4">
	<div class="text-center">
		<p class="text-zinc-400">Completing sign in...</p>
	</div>
</div>