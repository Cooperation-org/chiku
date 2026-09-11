import { useEffect, useState } from "react"
import { useTheme } from "@/lib/stores/theme"
import { useAuth } from "@/lib/stores/auth"
import { consumeReturnTo } from "@/lib/auth/returnTo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { BrandLogo, BrandWordmark } from "@/components/app/brand-logo"
import { Moon, Sun } from "lucide-react"

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

export default function LoginPage() {
  const { theme, toggle } = useTheme()
  const { login, loginWithBluesky } = useAuth()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLinkedTrust, setIsLoadingLinkedTrust] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [showBlueskyInput, setShowBlueskyInput] = useState(false)
  const [blueskyHandle, setBlueskyHandle] = useState("")
  const [isLoadingBluesky, setIsLoadingBluesky] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  // Surface errors left by the OAuth callback pages, once.
  useEffect(() => {
    const oauthError = sessionStorage.getItem("oauth_error")
    if (oauthError) {
      setError(oauthError)
      sessionStorage.removeItem("oauth_error")
    }
  }, [])

  async function handleLinkedTrustLogin() {
    setError("")
    setIsLoadingLinkedTrust(true)
    // Navigate to taiga-back, which 302s to the IdP server-side.
    const apiBase = import.meta.env.VITE_API_URL || "/api/v1"
    window.location.href = `${apiBase}/auth/linkedtrust/redirect`
  }

  function handleGoogleLogin() {
    if (!googleClientId) {
      setError("Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.")
      setIsLoadingGoogle(false)
      return
    }
    setError("")
    setIsLoadingGoogle(true)
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/google/callback`)
    const scope = encodeURIComponent("openid email profile")
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}&access_type=online`
  }

  async function handleBlueskyLogin() {
    if (!blueskyHandle.trim()) {
      setError("Please enter your Bluesky handle")
      return
    }
    setError("")
    setIsLoadingBluesky(true)
    const result = await loginWithBluesky(blueskyHandle.trim())
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl
    } else if (result.success) {
      window.location.href = consumeReturnTo() ?? "/"
    } else {
      setError(result.error || "Bluesky login failed")
      setIsLoadingBluesky(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    const result = await login(username, password)
    setIsLoading(false)
    if (result.success) {
      window.location.href = consumeReturnTo() ?? "/"
    } else {
      setError(result.error || "Login failed")
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="absolute top-4 right-4"
        title="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* The deployment's logo: the configured brand image, else the favicon,
              else the shipped Taiga default (BrandLogo degrades automatically).
              The SSO button below still carries the LinkedTrust mark — sign-in
              is shared by every tenant. */}
          <BrandLogo className="mx-auto mb-4 h-16 w-16" />
          <BrandWordmark className="text-2xl font-semibold" />
          <p className="mt-1 text-sm text-primary">Welcome! Sign in to continue.</p>
        </div>

        {error && (
          <div className="border-destructive/20 bg-destructive/10 text-destructive mb-4 rounded-md border p-3 text-sm">
            {error}
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="space-y-3 p-6">
            <Button
              type="button"
              onClick={handleLinkedTrustLogin}
              disabled={isLoadingLinkedTrust || isLoading}
              className="w-full"
            >
              <img src="/logo.svg" alt="" className="h-5 w-5" />
              {isLoadingLinkedTrust ? "Redirecting..." : "Sign in with LinkedTrust"}
            </Button>

            {googleClientId && (
              <Button type="button" variant="outline" onClick={handleGoogleLogin} className="w-full">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoadingGoogle ? "Redirecting..." : "Continue with Google"}
              </Button>
            )}

            {showBlueskyInput ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleBlueskyLogin()
                }}
                className="flex gap-2"
              >
                <Input
                  value={blueskyHandle}
                  onChange={(e) => setBlueskyHandle(e.target.value)}
                  placeholder="you.bsky.social"
                  autoFocus
                />
                <Button type="submit" disabled={isLoadingBluesky}>
                  {isLoadingBluesky ? "…" : "Go"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowBlueskyInput(false)
                    setError("")
                  }}
                >
                  ✕
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBlueskyInput(true)
                  setError("")
                }}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Continue with Bluesky
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="my-4 flex items-center justify-center">
          <div className="flex-1 border-t" />
          <span className="text-muted-foreground px-3 text-xs">or use a password</span>
          <div className="flex-1 border-t" />
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="your-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-muted-foreground mt-6 flex flex-col items-center gap-1 text-center">
          <p className="text-sm">Powered by Chiku</p>
          <p className="font-mono text-[11px] tracking-wide">v{__APP_VERSION__}</p>
        </div>
      </div>
    </div>
  )
}
