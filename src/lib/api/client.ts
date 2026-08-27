// Taiga API client with auth handling and automatic token refresh

// Use env variable in production, proxy in dev
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * A non-2xx response, carrying the parsed body so callers can react to a
 * specific error (e.g. Taiga's optimistic-concurrency `version` rejection)
 * without matching on the message text.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly body: Record<string, unknown>;

	constructor(status: number, message: string, body: Record<string, unknown>) {
		super(`[${status}] ${message}`);
		this.name = 'ApiError';
		this.status = status;
		this.body = body;
	}
}

interface RequestOptions extends RequestInit {
	params?: Record<string, string | number | boolean | undefined>;
	_isRetry?: boolean;
}

class TaigaClient {
	private token: string | null = null;
	private refreshToken: string | null = null;
	private refreshPromise: Promise<boolean> | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.token = localStorage.getItem('taiga_token');
			this.refreshToken = localStorage.getItem('taiga_refresh_token');
		}
	}

	setToken(token: string) {
		this.token = token;
		if (typeof window !== 'undefined') {
			localStorage.setItem('taiga_token', token);
		}
	}

	setRefreshToken(refreshToken: string) {
		this.refreshToken = refreshToken;
		if (typeof window !== 'undefined') {
			localStorage.setItem('taiga_refresh_token', refreshToken);
		}
	}

	clearToken() {
		this.token = null;
		this.refreshToken = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem('taiga_token');
			localStorage.removeItem('taiga_refresh_token');
		}
	}

	private async tryRefreshToken(): Promise<boolean> {
		// If already refreshing, wait for that to complete
		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		if (!this.refreshToken) {
			return false;
		}

		this.refreshPromise = (async () => {
			try {
				const response = await fetch(`${API_BASE}/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refresh: this.refreshToken })
				});

				if (!response.ok) {
					this.clearToken();
					return false;
				}

				const data = await response.json();
				if (data.auth_token) {
					this.setToken(data.auth_token);
					return true;
				}
				return false;
			} catch {
				this.clearToken();
				return false;
			} finally {
				this.refreshPromise = null;
			}
		})();

		return this.refreshPromise;
	}

	private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
		const { params, _isRetry, ...fetchOptions } = options;

		let url = `${API_BASE}${endpoint}`;
		if (params) {
			const searchParams = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined) {
					searchParams.append(key, String(value));
				}
			});
			const queryString = searchParams.toString();
			if (queryString) {
				url += `?${queryString}`;
			}
		}

		// FormData sets its own multipart Content-Type (with boundary) — never override it.
		const isFormData =
			typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

		const headers: HeadersInit = {
			...(isFormData ? {} : { 'Content-Type': 'application/json' }),
			...(options.headers || {})
		};

		if (this.token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
		}

		const response = await fetch(url, {
			...fetchOptions,
			headers
		});

		// Handle 401 - try to refresh token and retry once
		if (response.status === 401 && !_isRetry && this.refreshToken) {
			const refreshed = await this.tryRefreshToken();
			if (refreshed) {
				return this.request<T>(endpoint, { ...options, _isRetry: true });
			}
			// Refresh failed - redirect to login
			if (typeof window !== 'undefined') {
				window.location.href = '/login';
			}
		}

		if (!response.ok) {
			const error = await response.json().catch(() => ({ detail: 'Request failed' }));
			let message: string;
			if (error.detail) {
				message = error.detail;
			} else if (error._error_message) {
				message = error._error_message;
			} else if (error.error) {
				message = error.error;
			} else {
				// Field-level validation errors. Taiga sends the message either as a list
				// ({"description": ["This field is required."]}) or as a bare string
				// ({"version": "The version parameter is not valid"}) — read both, or the
				// user is shown raw JSON.
				const fieldErrors = Object.entries(error)
					.filter(([, v]) => Array.isArray(v) || typeof v === 'string')
					.map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
					.join('; ');
				message = fieldErrors || JSON.stringify(error) || `HTTP ${response.status}`;
			}
			throw new ApiError(response.status, message, error);
		}

		if (response.status === 204) {
			return undefined as T;
		}

		// Handle empty responses
		const text = await response.text();
		if (!text) {
			return undefined as T;
		}

		return JSON.parse(text);
	}

	get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
		return this.request<T>(endpoint, { method: 'GET', params });
	}

	post<T>(endpoint: string, data?: unknown) {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		});
	}

	/** Multipart POST (file uploads). Goes through the same auth/refresh/error path as post(). */
	postForm<T>(endpoint: string, form: FormData) {
		return this.request<T>(endpoint, { method: 'POST', body: form });
	}

	/** Fetch a URL as a blob with the auth header attached (Taiga media may be access-controlled). */
	async getBlob(url: string): Promise<Blob> {
		const headers: Record<string, string> = {};
		if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
		const response = await fetch(url, { headers });
		if (!response.ok) throw new Error(`[${response.status}] Could not fetch file`);
		return response.blob();
	}

	patch<T>(endpoint: string, data: unknown) {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
	}

	put<T>(endpoint: string, data: unknown) {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(data)
		});
	}

	delete<T>(endpoint: string) {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}

export const api = new TaigaClient();
export default api;
