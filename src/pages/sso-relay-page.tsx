import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { saveRelayTarget } from "@/lib/auth/relayTarget"

// SSO relay: a partner app (e.g. the workers.vc sign-in cascade) sends the
// browser here with ?next=<its own URL>. We sign the member in via
// LinkedTrust and then bounce straight back to that URL — so one login covers
// every team app. The ?next is accepted only if it is on the allowlist
// (relayTarget.ts / VITE_SSO_RELAY_ORIGINS); anything else is refused and the
// member simply lands on Marten.
export default function SsoRelayPage() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const next = new URLSearchParams(window.location.search).get("next")
    if (!saveRelayTarget(next)) {
      navigate({ to: "/", replace: true })
      return
    }
    // Kick off LinkedTrust login. A durable LinkedTrust session completes this
    // silently; the callback then reads the saved target and returns there.
    const apiBase = import.meta.env.VITE_API_URL || "/api/v1"
    window.location.href = `${apiBase}/auth/linkedtrust/redirect`
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">Signing you in with LinkedTrust&hellip;</p>
    </div>
  )
}

