import { useState } from "react"
import { Button } from "@/components/ui/button"

// Dev-only helper: import a Taiga auth token into localStorage so a local dev
// frontend can reuse a login made elsewhere (e.g. on production, where the
// backend's LINKEDTRUST_FRONTEND_URL always redirects the SSO round trip).
// Not rendered in production builds.

const isDev = import.meta.env.DEV

const copyCommand =
  'copy(JSON.stringify({t: localStorage.taiga_token, r: localStorage.taiga_refresh_token, u: localStorage.taiga_user}))'

const placeholderExample = '{"t":"eyJ...","r":"eyJ...","u":"{...}"}'

function parse(input: string): { token: string; refresh?: string; user: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Bare token (JWT-ish: dot-separated base64url segments)
  if (/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/.test(trimmed)) {
    return { token: trimmed, user: JSON.stringify({ auth_token: trimmed }) }
  }

  try {
    const d = JSON.parse(trimmed)
    if (d && typeof d === "object") {
      // {t, r, u} bundle copied from production localStorage
      if (typeof d.t === "string") {
        const user = typeof d.u === "string" ? d.u : JSON.stringify(d.u ?? { auth_token: d.t })
        return { token: d.t, refresh: typeof d.r === "string" ? d.r : undefined, user }
      }
      // raw taiga_user value ({auth_token, refresh})
      if (typeof d.auth_token === "string") {
        return {
          token: d.auth_token,
          refresh: typeof d.refresh === "string" ? d.refresh : undefined,
          user: trimmed,
        }
      }
    }
  } catch {
    // not JSON — fall through
  }
  return null
}

export default function DevTokenPage() {
  const [blob, setBlob] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function importToken() {
    setError("")
    setSuccess(false)
    const parsed = parse(blob)
    if (!parsed) {
      setError(
        "Could not read that. Paste either the {t, r, u} bundle, the raw taiga_user JSON, or a bare token."
      )
      return
    }
    localStorage.setItem("taiga_token", parsed.token)
    if (parsed.refresh) {
      localStorage.setItem("taiga_refresh_token", parsed.refresh)
    } else {
      localStorage.removeItem("taiga_refresh_token")
    }
    localStorage.setItem("taiga_user", parsed.user)
    setSuccess(true)
    setTimeout(() => {
      window.location.href = "/"
    }, 600)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {!isDev ? (
          <p className="text-muted-foreground text-center text-sm">
            Dev tool — not available in production builds.
          </p>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-semibold">Import auth token</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              On any host where you are signed in (e.g. marten.workers.vc), run:
            </p>
            <pre className="text-muted-foreground mb-4 overflow-x-auto rounded-md border bg-card p-3 text-xs">
              {copyCommand}
            </pre>
            <p className="text-muted-foreground mb-2 text-sm">Then paste it here:</p>
            <textarea
              value={blob}
              onChange={(e) => setBlob(e.target.value)}
              rows={6}
              placeholder={placeholderExample}
              className="focus:ring-ring w-full resize-none rounded-md border bg-card px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
            />
            {error && (
              <div className="border-destructive/20 bg-destructive/10 text-destructive mt-3 rounded-md border p-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                Token imported — taking you to the app...
              </div>
            )}
            <Button onClick={importToken} disabled={!blob.trim() || success} className="mt-4 w-full">
              {success ? "Imported" : "Import and sign in"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

