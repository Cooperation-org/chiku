// "Sign in with LinkedTrust" — OIDC client helper.
//
// LinkedTrust is the team identity provider (trust_claim_backend). It brokers
// Google, Bluesky (ATProto) and LinkedTrust accounts, so this single button is
// also Google + Bluesky underneath. The browser is sent to the IdP's authorize
// endpoint; the IdP redirects back to {origin}/oauth/callback with a code, which
// the callback hands to taiga-back's `linkedtrust` auth plugin to exchange.
//
// Deployment-agnostic: issuer URL and client_id come from public env vars, and
// the redirect_uri is derived from the current origin — so the same build runs
// on marten.linkedtrust.us and help.raisethevoices.org with only env differing.

// Must match the redirect_uri registered for each client in the IdP's
// oidc_clients table ({origin}/oauth/callback for both deployments).
export const LINKEDTRUST_REDIRECT_PATH = '/oauth/callback';

// Stored across the redirect to defend against CSRF on the callback.
const STATE_KEY = 'linkedtrust_oauth_state';

// Scopes the Taiga clients are registered for. The IdP returns a trust signal
// (`trust`) that the taiga-back plugin reads from /oauth/userinfo.
const SCOPE = 'openid email profile trust';

export function linkedtrustRedirectUri(origin: string): string {
	return `${origin}${LINKEDTRUST_REDIRECT_PATH}`;
}

// Build the authorize URL and persist the state. No PKCE: these are confidential
// clients whose secret lives in taiga-back, which does the code exchange.
export function buildLinkedTrustAuthorizeUrl(
	issuerUrl: string,
	clientId: string,
	origin: string
): string {
	const state = crypto.randomUUID();
	sessionStorage.setItem(STATE_KEY, state);

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: linkedtrustRedirectUri(origin),
		scope: SCOPE,
		state
	});
	return `${issuerUrl.replace(/\/$/, '')}/oauth/authorize?${params.toString()}`;
}

// Verify the returned state against the stored one (single use).
export function verifyLinkedTrustState(returnedState: string | null): boolean {
	const expected = sessionStorage.getItem(STATE_KEY);
	sessionStorage.removeItem(STATE_KEY);
	return !!expected && !!returnedState && expected === returnedState;
}
