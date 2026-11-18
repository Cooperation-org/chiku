import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// The public demo build (VITE_DEMO=1) is served from a sub-path, e.g.
// BASE_PATH=/chiku, as plain files: every demo page is prerendered so a static
// server with no fallback can serve it.
const demo = process.env.VITE_DEMO === '1';
const demoViews = ['board', 'backlog', 'epics', 'velocity'].map((v) => `/p/chiku-demo/${v}`);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: demo ? 'build-demo' : 'build',
			assets: demo ? 'build-demo' : 'build',
			fallback: demo ? undefined : 'index.html',
			precompress: false,
			strict: true
		}),
		paths: { base: process.env.BASE_PATH || '' },
		prerender: demo ? { entries: ['*', ...demoViews] } : undefined
	}
};

export default config;
