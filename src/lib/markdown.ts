import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Markdown -> sanitised HTML. The app is client-only (ssr = false), so DOMPurify
 * always has a real DOM to work with.
 */
export function renderMarkdown(source: string): string {
	const html = marked.parse(source, { async: false }) as string;
	const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
	// Attachments can come from anywhere (amebo, teammates) — send links to a new tab.
	return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}
