// Preserve the deep-linked URL across a login round-trip.
//
// The auth guard saves the visitor's original path (e.g. /p/<slug>/board?story=42)
// before bouncing to /login; every login success path consumes it and sends the
// user back there. sessionStorage survives the server-side LinkedTrust OIDC hop
// (${API}/auth/linkedtrust/redirect -> IdP -> /oauth/callback) because the whole
// round trip stays in the same tab, and it never leaks across tabs or sessions.

const KEY = 'marten_return_to';

// Auth-flow pages must never be a return target (redirect loop).
const AUTH_ROUTES = /^\/(login|oauth|auth)(\/|\?|#|$)/;

/**
 * Accept only same-app absolute paths. Rejects full URLs, protocol-relative
 * paths (//host, /\host) and auth-flow routes — so a tampered stored value can
 * never become an open redirect.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
	if (!raw) return null;
	if (!raw.startsWith('/')) return null;
	if (raw[1] === '/' || raw[1] === '\\') return null;
	if (AUTH_ROUTES.test(raw)) return null;
	return raw;
}

/** Save the path (pathname + search) to return to after login. */
export function saveReturnTo(path: string): void {
	if (typeof sessionStorage === 'undefined') return;
	const clean = sanitizeReturnTo(path);
	if (clean && clean !== '/') {
		sessionStorage.setItem(KEY, clean);
	}
}

/** Read, clear and validate the saved return path (single use). */
export function consumeReturnTo(): string | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(KEY);
	sessionStorage.removeItem(KEY);
	return sanitizeReturnTo(raw);
}
