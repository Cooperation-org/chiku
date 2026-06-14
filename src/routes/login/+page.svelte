<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import DesktopLogin from '$lib/components/auth/DesktopLogin.svelte';
	import MobileLogin from '$lib/components/auth/MobileLogin.svelte';

	// Use SvelteKit's $env/dynamic/public for browser-accessible public env vars
	const googleClientId = env.PUBLIC_GOOGLE_CLIENT_ID || '';
	const linkedtrustUrl = env.PUBLIC_LINKEDTRUST_URL || '';
	const linkedtrustClientId = env.PUBLIC_LINKEDTRUST_CLIENT_ID || '';

	let isMobile = false;
	let isDarkMode = true;
	let mediaQuery: MediaQueryList;

	function handleResize() {
		if (browser) {
			isMobile = window.innerWidth < 768;
		}
	}

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		if (browser) {
			localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
			document.documentElement.classList.toggle('dark', isDarkMode);
		}
	}

	onMount(() => {
		if (browser) {
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme) {
				isDarkMode = savedTheme === 'dark';
				document.documentElement.classList.toggle('dark', isDarkMode);
			}

			isMobile = window.innerWidth < 768;
			mediaQuery = window.matchMedia('(min-width: 768px)');
			mediaQuery.addEventListener('change', handleResize);
		}
	});

	onDestroy(() => {
		if (browser && mediaQuery) {
			mediaQuery.removeEventListener('change', handleResize);
		}
	});
</script>

<svelte:head>
	<title>Login - TaigaLT</title>
</svelte:head>

{#if isMobile}
	<MobileLogin {isDarkMode} onToggleTheme={toggleTheme} {googleClientId} {linkedtrustUrl} {linkedtrustClientId} />
{:else}
	<DesktopLogin {isDarkMode} onToggleTheme={toggleTheme} {googleClientId} {linkedtrustUrl} {linkedtrustClientId} />
{/if}
