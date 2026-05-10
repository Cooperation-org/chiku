import { writable } from 'svelte/store';
import type { AuthResponse } from '$lib/api/types';
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

		async register(data: { username: string; password: string; full_name: string; email?: string }): Promise<{ success: boolean; error?: string }> {
			update(s => ({ ...s, isLoading: true }));
			try {
				const response = await api.post<AuthResponse>('/auth/register', {
					username: data.username,
					password: data.password,
					full_name: data.full_name,
					email: data.email || `${data.username}@localhost`
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
				return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
			}
		},

		logout() {
			api.clearToken();
			if (typeof window !== 'undefined') {
				localStorage.removeItem('taiga_user');
			}
			set({ user: null, isAuthenticated: false, isLoading: false });
		}
	};
}

export const auth = createAuthStore();
