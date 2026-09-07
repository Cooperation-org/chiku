import { create } from "zustand"
import type { AuthResponse, AtprotoAuthorizeResponse, AtprotoSession } from "@/lib/api/types"
import { api } from "@/lib/api/client"
import { queryPersister } from "@/lib/query"

interface AuthState {
  user: AuthResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  init(): void
  login(username: string, password: string): Promise<{ success: boolean; error?: string }>
  loginWithGoogle(googleAuthCode: string): Promise<{ success: boolean; error?: string }>
  loginWithLinkedTrust(
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; error?: string }>
  loginWithBluesky(
    handle: string
  ): Promise<{ success: boolean; error?: string; redirectUrl?: string }>
  logout(): void
  setProfile(profile: Partial<AuthResponse>): void
  handleAuthSuccess(accessToken: string, refreshToken?: string, userData?: Partial<AuthResponse>): void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  init() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("taiga_token")
      const userJson = localStorage.getItem("taiga_user")
      if (token && userJson) {
        try {
          const user = JSON.parse(userJson)
          set({ user, isAuthenticated: true, isLoading: false })
          return
        } catch {
          // Invalid stored data
        }
      }
    }
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  async login(username, password) {
    set({ isLoading: true })
    try {
      const response = await api.post<AuthResponse>("/auth", {
        username,
        password,
        type: "normal",
      })

      api.setToken(response.auth_token)
      api.setRefreshToken(response.refresh)
      if (typeof window !== "undefined") {
        localStorage.setItem("taiga_user", JSON.stringify(response))
      }

      set({ user: response, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err instanceof Error ? err.message : "Login failed" }
    }
  },

  async loginWithGoogle(googleAuthCode) {
    set({ isLoading: true })
    try {
      const response = await api.post<AuthResponse>("/auth/google", {
        googleAuthCode,
      })

      api.setToken(response.auth_token)
      api.setRefreshToken(response.refresh)
      if (typeof window !== "undefined") {
        localStorage.setItem("taiga_user", JSON.stringify(response))
      }

      set({ user: response, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err instanceof Error ? err.message : "Google login failed" }
    }
  },

  async loginWithLinkedTrust(code, redirectUri) {
    set({ isLoading: true })
    try {
      const response = await api.post<AuthResponse>("/auth", {
        type: "linkedtrust",
        code,
        redirect_uri: redirectUri,
      })

      api.setToken(response.auth_token)
      api.setRefreshToken(response.refresh)
      if (typeof window !== "undefined") {
        localStorage.setItem("taiga_user", JSON.stringify(response))
      }

      set({ user: response, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return {
        success: false,
        error: err instanceof Error ? err.message : "LinkedTrust login failed",
      }
    }
  },

  async loginWithBluesky(handle) {
    set({ isLoading: true })
    try {
      const response = await api.post<AtprotoAuthorizeResponse>("/auth/atproto/authorize", {
        handle,
      })

      if (response.url) {
        set({ isLoading: false })
        return { success: false, redirectUrl: response.url }
      }

      if (response.auth_token) {
        api.setToken(response.auth_token)
        if (response.refresh) {
          api.setRefreshToken(response.refresh)
        }
        if (typeof window !== "undefined") {
          const session: AtprotoSession = {
            accessToken: response.auth_token,
            refreshToken: response.refresh,
            handle,
          }
          localStorage.setItem("atproto_session", JSON.stringify(session))
          localStorage.setItem(
            "taiga_user",
            JSON.stringify({ auth_token: response.auth_token, refresh: response.refresh })
          )
        }
        set({ user: null, isAuthenticated: true, isLoading: false })
        return { success: true }
      }

      set({ isLoading: false })
      return { success: false, error: "No auth token received from Bluesky" }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: err instanceof Error ? err.message : "Bluesky login failed" }
    }
  },

  logout() {
    api.clearToken()
    if (typeof window !== "undefined") {
      localStorage.removeItem("taiga_user")
      localStorage.removeItem("atproto_session")
    }
    // Drop the persisted query cache so the next account never sees this
    // one's projects flash by.
    void queryPersister.removeClient()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  /** Keep the stored user in step after the person edits their own profile. */
  setProfile(profile) {
    const user = get().user
    if (!user) return
    const updated = { ...user, ...profile }
    if (typeof window !== "undefined") {
      localStorage.setItem("taiga_user", JSON.stringify(updated))
    }
    set({ user: updated })
  },

  handleAuthSuccess(accessToken, refreshToken, userData) {
    api.setToken(accessToken)
    if (refreshToken) {
      api.setRefreshToken(refreshToken)
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("taiga_token", accessToken)
      if (refreshToken) {
        localStorage.setItem("taiga_refresh_token", refreshToken)
      }
      if (userData) {
        localStorage.setItem("taiga_user", JSON.stringify(userData))
      }
    }
    set({ user: userData as AuthResponse, isAuthenticated: true, isLoading: false })
  },
}))
