import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/stores/auth"
import { consumeReturnTo } from "@/lib/auth/returnTo"
import { consumeRelayTarget } from "@/lib/auth/relayTarget"

const ERROR_MESSAGES: Record<string, string> = {
  pending_approval: "Your account is pending approval.",
  auth_failed: "Sign-in failed. Please try again.",
  expired: "The sign-in request expired. Please try again.",
  state_mismatch: "Sign-in could not be verified. Please try again.",
  no_email: "That account has no email address.",
}

export default function OauthCallbackPage() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    // In React StrictMode this component mounts twice in dev; the token
    // exchange is done purely from the URL fragment, but the navigation and
    // history rewrite must still happen once.
    if (ran.current) return
    ran.current = true

    function fail(message: string) {
      sessionStorage.setItem("oauth_error", message)
      navigate({ to: "/login" })
    }

    // Check for error in query params (backend redirects here on failure)
    const queryError = new URLSearchParams(window.location.search).get("error")
    if (queryError) {
      fail(ERROR_MESSAGES[queryError] || "Sign-in error. Please try again.")
      return
    }

    // Tokens arrive in the URL fragment (server-side flow)
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    const params = new URLSearchParams(hash)
    const authToken = params.get("auth_token")
    const refresh = params.get("refresh")

    if (authToken) {
      // Strip fragment from URL/history before continuing
      window.history.replaceState(null, "", window.location.pathname)

      useAuth.getState().handleAuthSuccess(authToken, refresh || undefined, {
        auth_token: authToken,
        refresh: refresh || undefined,
      })

      // SSO relay (a partner app sent us here to sign in and bounce back):
      // return to that allowlisted external origin. A full-page nav is used
      // because the target is off-origin; router navigation is same-app only.
      const relay = consumeRelayTarget()
      if (relay) {
        window.location.href = relay
        return
      }

      // Otherwise return to the deep-linked page saved before the OIDC hop.
      navigate({ to: consumeReturnTo() ?? "/" })
    } else {
      fail("LinkedTrust sign-in failed. Please try again.")
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">Completing sign in with LinkedTrust...</p>
    </div>
  )
}

