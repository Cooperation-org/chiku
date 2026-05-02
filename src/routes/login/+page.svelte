<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	let username = '';
	let password = '';
	let error = '';
	let isLoading = false;

	async function handleSubmit() {
		error = '';
		isLoading = true;

		const result = await auth.login(username, password);

		isLoading = false;

		if (result.success) {
			goto('/');
		} else {
			error = result.error || 'Login failed';
		}
	}
</script>

<svelte:head>
	<title>Login - TaigaLT</title>
</svelte:head>

<div class="min-h-screen bg-surface-0 flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<!-- Logo -->
		<div class="text-center mb-8">
			<img src="/logo.svg" alt="LinkedTrust" class="w-16 h-16 mx-auto mb-4" />
			<h1 class="text-2xl font-semibold text-zinc-100">
				Taiga<span class="text-lt-cyan">LT</span>
			</h1>
<p class="text-lt-cyan mt-1">Welcome Aya! Ready to build?</p>
		</div>

		<!-- Login Form -->
		<form on:submit|preventDefault={handleSubmit} class="bg-surface-2 rounded-lg border border-border p-6">
			{#if error}
				<div class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
					{error}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-medium text-zinc-400 mb-1">
						Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						class="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lt-cyan focus:ring-1 focus:ring-lt-cyan"
						placeholder="Enter your username"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-zinc-400 mb-1">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lt-cyan focus:ring-1 focus:ring-lt-cyan"
						placeholder="Enter your password"
					/>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-2 px-4 bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{#if isLoading}
						Signing in...
					{:else}
						Sign in
					{/if}
				</button>
			</div>
		</form>

		<p class="text-center text-zinc-500 text-sm mt-4">
			Connecting to Taiga backend
		</p>
	</div>
</div>
