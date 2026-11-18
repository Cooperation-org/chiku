// Only the demo build prerenders project pages (its one sample board);
// a normal build serves them through the SPA fallback.
export const prerender = import.meta.env.VITE_DEMO === '1';
export const ssr = false;
