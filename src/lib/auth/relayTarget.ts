// Cross-origin SSO relay target.
//
// Marten's own post-login return (returnTo.ts) is SAME-ORIGIN by design — an
// open-redirect guard. The SSO relay is the deliberate, narrow exception: it
// lets a partner app (e.g. the workers.vc sign-in cascade) send the browser
// through Marten's LinkedTrust login and then straight back to itself, so the
// member signs in once for every team app. Because that means redirecting to
// another origin, the target is checked against a strict allowlist — never a
// caller-supplied origin, only origins we explicitly trust.
//
// Allowlist source: VITE_SSO_RELAY_ORIGINS (comma-separated absolute origins),
// e.g. "https://workers.vc,https://dash.workers.vc". Unset -> relay disabled
// (no external target is ever accepted).

const KEY = 'marten_sso_relay_next';

function allowedOrigins(): string[] {
	const raw = (import.meta.env.VITE_SSO_RELAY_ORIGINS as string | undefined) || '';
	return raw
		.split(',')
		.map((s) => s.trim().replace(/\/+$/, ''))
		.filter(Boolean);
}

/**
 * Accept an absolute https URL only if its origin is on the allowlist. Returns
 * the normalized URL string, or null if missing / malformed / not allowlisted.
 * A tampered value can therefore only ever be one of the origins we trust.
 */
export function sanitizeRelayTarget(raw: string | null | undefined): string | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:') return null;
	if (!allowedOrigins().includes(url.origin)) return null;
	return url.toString();
}

/** Save the (validated) external target to return to after login. */
export function saveRelayTarget(raw: string | null | undefined): boolean {
	if (typeof sessionStorage === 'undefined') return false;
	const clean = sanitizeRelayTarget(raw);
	if (!clean) return false;
	sessionStorage.setItem(KEY, clean);
	return true;
}

/** Read, clear and re-validate the saved external target (single use). */
export function consumeRelayTarget(): string | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(KEY);
	sessionStorage.removeItem(KEY);
	return sanitizeRelayTarget(raw);
}
