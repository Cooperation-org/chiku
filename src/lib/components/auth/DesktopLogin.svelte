<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import BlueskyLogin from '$lib/components/auth/BlueskyLogin.svelte';
	import { buildLinkedTrustAuthorizeUrl } from '$lib/auth/linkedtrust';

	export let isDarkMode: boolean = true;
	export let onToggleTheme: () => void = () => {};
	export let googleClientId: string = '';
	export let linkedtrustUrl: string = '';
	export let linkedtrustClientId: string = '';

	let username = '';
	let password = '';
	let fullName = '';
	let email = '';
	let acceptedTerms = false;
	let acceptedPrivacy = false;
	let error = '';
	let isLoading = false;
	let isLoadingLinkedTrust = false;
	let isLoadingGoogle = false;

	// Tab: 'login' | 'register'
	let activeTab: 'login' | 'register' = 'login';

	// Bluesky toggle
	let showBlueskyInput = false;
	let blueskyHandle = '';
	let isLoadingBluesky = false;

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			isDarkMode = savedTheme === 'dark';
		}

		// Check for OAuth error messages
		if (typeof window !== 'undefined') {
			const oauthError = sessionStorage.getItem('oauth_error');
			if (oauthError) {
				error = oauthError;
				sessionStorage.removeItem('oauth_error');
			}
		}
	});

	async function handleLinkedTrustLogin() {
		error = '';
		isLoadingLinkedTrust = true;
		// Navigate to taiga-back, which 302s to the IdP server-side (amebo pattern)
		const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
		window.location.href = `${apiBase}/auth/linkedtrust/redirect`;
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

		{#if error}
			<div class="mb-4 p-3 rounded-md text-sm" style="background-color: rgb(239 68 68 / 0.1); border: 1px solid rgb(239 68 68 / 0.2); color: #ef4444;">
				{error}
			</div>
		{/if}

		<!-- Federated sign-in — LinkedTrust is the primary option; it brokers Google + Bluesky -->
		<div class="rounded-lg p-6 mb-4 space-y-3" style="background-color: var(--bg-elevated); border: 1px solid var(--border-default);">
			<!-- LinkedTrust (primary) -->
			<button
				type="button"
				on:click={handleLinkedTrustLogin}
				disabled={isLoadingLinkedTrust || isLoading}
				class="w-full py-2 px-4 font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
			>
				<img src="/logo.svg" alt="" class="w-5 h-5" />
				{isLoadingLinkedTrust ? 'Redirecting...' : 'Sign in with LinkedTrust'}
			</button>

			<!-- Google OAuth -->
		{#if googleClientId}
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

		{/if}

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
		</div>

		<!-- Divider -->
		<div class="relative flex items-center justify-center my-4">
			<div class="flex-1 border-t" style="border-color: var(--border-default);"></div>
			<span class="px-3 text-xs" style="color: var(--text-muted);">or use a password</span>
			<div class="flex-1 border-t" style="border-color: var(--border-default);"></div>
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

		</form>

		<p class="text-center text-sm mt-4" style="color: var(--text-muted);">
			Connecting to Taiga backend
		</p>
	</div>
</div>