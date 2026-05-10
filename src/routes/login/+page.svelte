<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	let username = '';
	let password = '';
	let fullName = '';
	let email = '';
	let error = '';
	let isLoading = false;

	// Tab: 'login' | 'register'
	let activeTab: 'login' | 'register' = 'login';

	async function handleSubmit() {
		error = '';
		isLoading = true;

		let result;
		if (activeTab === 'login') {
			result = await auth.login(username, password);
		} else {
			result = await auth.register({ username, password, full_name: fullName, email: email || undefined });
		}

		isLoading = false;

		if (result.success) {
			goto('/');
		} else {
			error = result.error || (activeTab === 'login' ? 'Login failed' : 'Registration failed');
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
			<p class="text-lt-cyan mt-1">Welcome! Sign in to continue.</p>
		</div>

		<!-- Tabs -->
		<div class="flex bg-surface-2 rounded-lg border border-border p-1 mb-4">
			<button
				class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
				class:bg-surface-3={activeTab === 'login'}
				class:text-zinc-100={activeTab === 'login'}
				class:text-zinc-400={activeTab !== 'login'}
				on:click={() => { activeTab = 'login'; error = ''; }}
			>
				Sign In
			</button>
			<button
				class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
				class:bg-surface-3={activeTab === 'register'}
				class:text-zinc-100={activeTab === 'register'}
				class:text-zinc-400={activeTab !== 'register'}
				on:click={() => { activeTab = 'register'; error = ''; }}
			>
				Create Account
			</button>
		</div>

		<!-- Form -->
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
						placeholder="your-username"
					/>
				</div>

				{#if activeTab === 'register'}
					<div>
						<label for="fullName" class="block text-sm font-medium text-zinc-400 mb-1">
							Full Name
						</label>
						<input
							id="fullName"
							type="text"
							bind:value={fullName}
							required={activeTab === 'register'}
							class="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lt-cyan focus:ring-1 focus:ring-lt-cyan"
							placeholder="Your Name"
						/>
					</div>
					<div>
						<label for="email" class="block text-sm font-medium text-zinc-400 mb-1">
							Email <span class="text-zinc-600">(optional)</span>
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							class="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lt-cyan focus:ring-1 focus:ring-lt-cyan"
							placeholder="you@example.com"
						/>
					</div>
				{/if}

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
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-2 px-4 bg-lt-cyan text-zinc-900 font-medium rounded-md hover:bg-lt-cyan/90 focus:outline-none focus:ring-2 focus:ring-lt-cyan focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{#if isLoading}
						{activeTab === 'login' ? 'Signing in...' : 'Creating account...'}
					{:else if activeTab === 'login'}
						Sign in
					{:else}
						Create Account
					{/if}
				</button>
			</div>
		</form>

		<p class="text-center text-zinc-500 text-sm mt-4">
			Connecting to Taiga backend
		</p>
	</div>
</div>