import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/stores/auth"
import { consumeReturnTo } from "@/lib/auth/returnTo"

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const errorParam = params.get("error")

    if (errorParam) {
      sessionStorage.setItem("oauth_error", "Google sign-in was cancelled or denied.")
      navigate({ to: "/login" })
      return
    }
    if (!code) {
      sessionStorage.setItem("oauth_error", "No authorization code received from Google.")
      navigate({ to: "/login" })
      return
    }

    // The auth-code POST must run exactly once — a retry consumes an already
    // used code and always fails.
    useAuth
      .getState()
      .loginWithGoogle(code)
      .then((result) => {
        if (result.success) {
          navigate({ to: consumeReturnTo() ?? "/" })
        } else {
          sessionStorage.setItem(
            "oauth_error",
            result.error || "Google sign-in failed. Please try again."
          )
          navigate({ to: "/login" })
        }
      })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">Completing sign in with Google...</p>
    </div>
  )
}

