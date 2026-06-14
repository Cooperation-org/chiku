import { writable } from 'svelte/store';
import type { AuthResponse, AtprotoAuthorizeResponse, AtprotoSession } from '$lib/api/types';
import { api } from '$lib/api/client';

interface AuthState {
	user: AuthResponse | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isAuthenticated: false,
		isLoading: true
	});

	return {
		subscribe,

		init() {
			if (typeof window !== 'undefined') {
				const token = localStorage.getItem('taiga_token');
				const userJson = localStorage.getItem('taiga_user');
				if (token && userJson) {
					try {
						const user = JSON.parse(userJson);
						set({ user, isAuthenticated: true, isLoading: false });
						return;
					} catch {
						// Invalid stored data
					}
				}
			}
			set({ user: null, isAuthenticated: false, isLoading: false });
		},

		async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
			update(s => ({ ...s, isLoading: true }));
			try {
				const response = await api.post<AuthResponse>('/auth', {
					username,
					password,
					type: 'normal'
				});

				api.setToken(response.auth_token);
				api.setRefreshToken(response.refresh);
				if (typeof window !== 'undefined') {
					localStorage.setItem('taiga_user', JSON.stringify(response));
				}

				set({ user: response, isAuthenticated: true, isLoading: false });
				return { success: true };
			} catch (err) {
				update(s => ({ ...s, isLoading: false }));
				return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
			}
		},

		logout() {
			api.clearToken();
			if (typeof window !== 'undefined') {
				localStorage.removeItem('taiga_user');
				localStorage.removeItem('atproto_session');
			}
			set({ user: null, isAuthenticated: false, isLoading: false });
		},

		async loginWithGoogle(googleAuthCode: string): Promise<{ success: boolean; error?: string }> {
			update(s => ({ ...s, isLoading: true }));
			try {
				const response = await api.post<AuthResponse>('/auth/google', {
					googleAuthCode
				});

				api.setToken(response.auth_token);
				api.setRefreshToken(response.refresh);
				if (typeof window !== 'undefined') {
					localStorage.setItem('taiga_user', JSON.stringify(response));
				}

				set({ user: response, isAuthenticated: true, isLoading: false });
				return { success: true };
			} catch (err) {
				update(s => ({ ...s, isLoading: false }));
				return { success: false, error: err instanceof Error ? err.message : 'Google login failed' };
			}
		},

		async loginWithLinkedTrust(code: string, redirectUri: string): Promise<{ success: boolean; error?: string }> {
			update(s => ({ ...s, isLoading: true }));
			try {
				const response = await api.post<AuthResponse>('/auth', {
					type: 'linkedtrust',
					code,
					redirect_uri: redirectUri
				});

				api.setToken(response.auth_token);
				api.setRefreshToken(response.refresh);
				if (typeof window !== 'undefined') {
					localStorage.setItem('taiga_user', JSON.stringify(response));
				}

				set({ user: response, isAuthenticated: true, isLoading: false });
				return { success: true };
			} catch (err) {
				update(s => ({ ...s, isLoading: false }));
				return { success: false, error: err instanceof Error ? err.message : 'LinkedTrust login failed' };
			}
		},

		async loginWithBluesky(handle: string): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
			update(s => ({ ...s, isLoading: true }));
			try {
				const response = await api.post<AtprotoAuthorizeResponse>('/auth/atproto/authorize', {
					handle
				});

				if (response.url) {
					update(s => ({ ...s, isLoading: false }));
					return { success: false, redirectUrl: response.url };
				}

				if (response.auth_token) {
					api.setToken(response.auth_token);
					if (response.refresh) {
						api.setRefreshToken(response.refresh);
					}
					if (typeof window !== 'undefined') {
						const session: AtprotoSession = { accessToken: response.auth_token, refreshToken: response.refresh, handle };
						localStorage.setItem('atproto_session', JSON.stringify(session));
						localStorage.setItem('taiga_user', JSON.stringify({ auth_token: response.auth_token, refresh: response.refresh }));
					}
					set({ user: null, isAuthenticated: true, isLoading: false });
					return { success: true };
				}

				update(s => ({ ...s, isLoading: false }));
				return { success: false, error: 'No auth token received from Bluesky' };
			} catch (err) {
				update(s => ({ ...s, isLoading: false }));
				return { success: false, error: err instanceof Error ? err.message : 'Bluesky login failed' };
			}
		},

		handleAuthSuccess(accessToken: string, refreshToken?: string, userData?: Partial<AuthResponse>) {
			api.setToken(accessToken);
			if (refreshToken) {
				api.setRefreshToken(refreshToken);
			}
			if (typeof window !== 'undefined') {
				localStorage.setItem('taiga_token', accessToken);
				if (refreshToken) {
					localStorage.setItem('taiga_refresh_token', refreshToken);
				}
				if (userData) {
					localStorage.setItem('taiga_user', JSON.stringify(userData));
				}
			}
			set({ user: userData as AuthResponse, isAuthenticated: true, isLoading: false });
		}
	};
}

export const auth = createAuthStore();
