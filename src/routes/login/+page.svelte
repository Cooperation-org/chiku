<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	let username = '';
	let password = '';
	let fullName = '';
	let email = '';
	let acceptedTerms = false;
	let acceptedPrivacy = false;
	let error = '';
	let isLoading = false;
	let isLoadingGithub = false;

	// Tab: 'login' | 'register'
	let activeTab: 'login' | 'register' = 'login';

	async function handleGitHubLogin() {
		error = '';
		isLoadingGithub = true;
		// GitHub OAuth flow: redirect to GitHub, then callback with code
		const callbackUrl = encodeURIComponent(window.location.origin + '/auth/github/callback');
		window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23licRF3Gcsij7dHgM&scope=user:email&redirect_uri=${callbackUrl}`;
	}

	async function handleSubmit() {
		error = '';
		isLoading = true;

		let result;
		if (activeTab === 'login') {
			result = await auth.login(username, password);
		} else {
			if (activeTab === 'register' && (!acceptedTerms || !acceptedPrivacy)) {
				error = 'You must accept our terms of service and privacy policy';
				isLoading = false;
				return;
			}
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

			<!-- GitHub OAuth -->
			<div class="mb-4">
				<button
					type="button"
					on:click={handleGitHubLogin}
					disabled={isLoadingGithub || isLoading}
					class="w-full py-2 px-4 bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					{isLoadingGithub ? 'Redirecting...' : 'Continue with GitHub'}
				</button>
			</div>

			<div class="relative flex items-center justify-center mb-4">
				<div class="border-t border-border flex-1"></div>
				<span class="px-3 text-xs text-zinc-500">or</span>
				<div class="border-t border-border flex-1"></div>
			</div>

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

				{#if activeTab === 'register'}
					<div class="border-t border-border pt-4 mt-4">
						<label class="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={acceptedTerms}
								class="mt-1 accent-lt-cyan"
							/>
							<span class="text-sm text-zinc-400">
								I accept the <a href="/terms" class="text-lt-cyan hover:underline">terms of service</a>
							</span>
						</label>
						<label class="flex items-start gap-2 cursor-pointer mt-2">
							<input
								type="checkbox"
								bind:checked={acceptedPrivacy}
								class="mt-1 accent-lt-cyan"
							/>
							<span class="text-sm text-zinc-400">
								I accept the <a href="/privacy" class="text-lt-cyan hover:underline">privacy policy</a>
							</span>
						</label>
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