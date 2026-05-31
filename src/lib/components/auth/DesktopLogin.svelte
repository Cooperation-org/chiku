<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import BlueskyLogin from '$lib/components/auth/BlueskyLogin.svelte';

	export let isDarkMode: boolean = true;
	export let onToggleTheme: () => void = () => {};
	export let googleClientId: string = '';

	let username = '';
	let password = '';
	let fullName = '';
	let email = '';
	let acceptedTerms = false;
	let acceptedPrivacy = false;
	let error = '';
	let isLoading = false;
	let isLoadingGithub = false;
	let isLoadingGoogle = false;

	// Tab: 'login' | 'register'
	let activeTab: 'login' | 'register' = 'login';

	// Bluesky toggle
	let showBlueskyInput = false;
	let blueskyHandle = '';
	let isLoadingBluesky = false;

	// MetaMask detection
	let hasMetaMask = false;

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			isDarkMode = savedTheme === 'dark';
		}
		hasMetaMask = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
	});

	async function handleGitHubLogin() {
		error = '';
		isLoadingGithub = true;
		const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
		window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23licRF3Gcsij7dHgM&scope=user:email&redirect_uri=${callbackUrl}`;
	}

	async function handleGoogleLogin() {
		if (!googleClientId) {
			error = 'Google OAuth is not configured. Set PUBLIC_GOOGLE_CLIENT_ID in your .env file.';
			isLoadingGoogle = false;
			return;
		}
		error = '';
		isLoadingGoogle = true;
		const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
		const scope = encodeURIComponent('openid email profile');
		window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}&access_type=online`;
	}

	async function handleBlueskyLogin() {
		if (!blueskyHandle.trim()) {
			error = 'Please enter your Bluesky handle';
			return;
		}
		error = '';
		isLoadingBluesky = true;

		const result = await auth.loginWithBluesky(blueskyHandle.trim());

		if (result.redirectUrl) {
			window.location.href = result.redirectUrl;
		} else if (result.success) {
			window.location.href = '/';
		} else {
			error = result.error || 'Bluesky login failed';
			isLoadingBluesky = false;
		}
	}

	async function handleMetaMaskLogin() {
		if (!window.ethereum) {
			error = 'MetaMask is not installed';
			return;
		}
		error = 'MetaMask login not configured';
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
			window.location.href = '/';
		} else {
			error = result.error || (activeTab === 'login' ? 'Login failed' : 'Registration failed');
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background-color: var(--bg-app);">
	<div class="w-full max-w-sm">
		<!-- Logo -->
		<div class="text-center mb-8">
			<img src="/logo.svg" alt="LinkedTrust" class="w-16 h-16 mx-auto mb-4" loading="lazy" />
			<h1 class="text-2xl font-semibold" style="color: var(--text-primary);">
				Taiga<span style="color: var(--accent);">LT</span>
			</h1>
			<p class="mt-1" style="color: var(--accent);">Welcome! Sign in to continue.</p>
		</div>

		<!-- Tabs -->
		<div class="flex rounded-lg p-1 mb-4" style="background-color: var(--bg-hover); border: 1px solid var(--border-default);">
			<button
				class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
				style={activeTab === 'login' ? `background-color: var(--bg-active); color: var(--text-primary);` : `color: var(--text-muted);`}
				on:click={() => { activeTab = 'login'; error = ''; }}
			>
				Sign In
			</button>
			<button
				class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
				style={activeTab === 'register' ? `background-color: var(--bg-active); color: var(--text-primary);` : `color: var(--text-muted);`}
				on:click={() => { activeTab = 'register'; error = ''; }}
			>
				Create Account
			</button>
		</div>

		<!-- Form -->
		<form on:submit|preventDefault={handleSubmit} class="rounded-lg p-6" style="background-color: var(--bg-elevated); border: 1px solid var(--border-default);">
			{#if error}
				<div class="mb-4 p-3 rounded-md text-sm" style="background-color: rgb(239 68 68 / 0.1); border: 1px solid rgb(239 68 68 / 0.2); color: #ef4444;">
					{error}
				</div>
			{/if}

			<!-- Manual Credentials Section -->
			<div class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
						Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-1"
						style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
						placeholder="your-username"
					/>
				</div>

				{#if activeTab === 'register'}
					<div>
						<label for="fullName" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
							Full Name
						</label>
						<input
							id="fullName"
							type="text"
							bind:value={fullName}
							required={activeTab === 'register'}
							class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-1"
							style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
							placeholder="Your Name"
						/>
					</div>
					<div>
						<label for="email" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
							Email <span style="color: var(--text-muted);">(optional)</span>
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-1"
							style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
							placeholder="you@example.com"
						/>
					</div>
				{/if}

				<div>
					<label for="password" class="block text-sm font-medium mb-1" style="color: var(--text-secondary);">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-1"
						style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
						placeholder="••••••••"
					/>
				</div>

				{#if activeTab === 'register'}
					<div class="border-t pt-4 mt-4" style="border-color: var(--border-default);">
						<label class="flex items-start gap-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={acceptedTerms}
								class="mt-1"
								style="accent-color: var(--accent);"
							/>
							<span class="text-sm" style="color: var(--text-secondary);">
								I accept the <a href="/terms" style="color: var(--accent);" class="hover:underline">terms of service</a>
							</span>
						</label>
						<label class="flex items-start gap-2 cursor-pointer mt-2">
							<input
								type="checkbox"
								bind:checked={acceptedPrivacy}
								class="mt-1"
								style="accent-color: var(--accent);"
							/>
							<span class="text-sm" style="color: var(--text-secondary);">
								I accept the <a href="/privacy" style="color: var(--accent);" class="hover:underline">privacy policy</a>
							</span>
						</label>
					</div>
				{/if}

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-2 px-4 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
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

			<!-- Divider -->
			<div class="relative flex items-center justify-center my-4">
				<div class="flex-1 border-t" style="border-color: var(--border-default);"></div>
				<span class="px-3 text-xs" style="color: var(--text-muted);">or</span>
				<div class="flex-1 border-t" style="border-color: var(--border-default);"></div>
			</div>

			<!-- OAuth Buttons Section -->
			<div class="space-y-3">
				<!-- GitHub OAuth -->
				<button
					type="button"
					on:click={handleGitHubLogin}
					disabled={isLoadingGithub || isLoading}
					class="w-full py-2 px-4 font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					{isLoadingGithub ? 'Redirecting...' : 'Continue with GitHub'}
				</button>

				<!-- Google OAuth -->
				<button
					type="button"
					on:click={handleGoogleLogin}
					disabled={isLoadingGoogle || isLoading}
					class="w-full py-2 px-4 font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					style="background-color: var(--bg-hover); border: 1px solid var(--border-default); color: var(--text-primary);"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					{isLoadingGoogle ? 'Redirecting...' : 'Continue with Google'}
				</button>

				<!-- Bluesky OAuth -->
				{#if showBlueskyInput}
					<BlueskyLogin
						bind:handle={blueskyHandle}
						{isLoadingBluesky}
						on:submit={handleBlueskyLogin}
						on:cancel={() => { showBlueskyInput = false; error = ''; }}
					/>
				{:else}
					<button
						type="button"
						on:click={() => { showBlueskyInput = true; error = ''; }}
						disabled={isLoading}
						class="w-full py-2 px-4 font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						style="background-color: #0a7bf4; border: 1px solid var(--border-default); color: #ffffff;"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
						</svg>
						Continue with Bluesky
					</button>
				{/if}

				<!-- MetaMask (Desktop only) -->
				{#if hasMetaMask}
					<button
						type="button"
						on:click={handleMetaMaskLogin}
						class="w-full py-2 px-4 font-medium rounded-md transition-colors flex items-center justify-center gap-2"
						style="background-color: #f6851b; border: 1px solid var(--border-default); color: #ffffff;"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						</svg>
						Connect MetaMask
					</button>
				{/if}
			</div>
		</form>

		<p class="text-center text-sm mt-4" style="color: var(--text-muted);">
			Connecting to Taiga backend
		</p>
	</div>
</div>