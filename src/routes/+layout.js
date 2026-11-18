export const prerender = true;
export const ssr = false;
// The demo build is served as plain files: each page as <path>/index.html.
export const trailingSlash = import.meta.env.VITE_DEMO === '1' ? 'always' : 'never';
