import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/stores/auth"
import { consumeReturnTo } from "@/lib/auth/returnTo"

export default function AtprotoCallbackPage() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)

    const accessToken = params.get("accessToken") || params.get("code")
    const refreshToken = params.get("refreshToken")

    if (!accessToken) {
      navigate({ to: "/login" })
      return
    }

    useAuth.getState().handleAuthSuccess(accessToken, refreshToken ?? undefined)

    const handle = params.get("handle") ?? ""
    const blueskySession = {
      accessToken,
      refreshToken: refreshToken || undefined,
      handle,
    }
    localStorage.setItem("atproto_session", JSON.stringify(blueskySession))

    navigate({ to: consumeReturnTo() ?? "/" })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">Completing sign in with Bluesky...</p>
    </div>
  )
}

