import { motion } from "motion/react"
import { useRouter } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { BrailleLoader } from "@/components/ui/braille-loader"
import { BrandLogo } from "@/components/app/brand-logo"
import { Button } from "@/components/ui/button"
import { PAGE_EASE_OUT } from "@/lib/motion"

/**
 * Unified page states. One house style for every loading / error / notFound
 * surface: router `defaultPendingComponent`/`defaultErrorComponent`/
 * `defaultNotFoundComponent` AND per-page React Query `isLoading`/`isError`
 * branches render these, so the app waits the same way everywhere.
 *
 * All three are bare motion elements (opacity-only, 150ms) meant to be
 * swapped inside <PagePresence> — direct children, each with a stable key.
 */

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: PAGE_EASE_OUT },
} as const

function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
    >
      {children}
    </motion.div>
  )
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <StateShell>
      {/* House loader: chase variant, fast speed (perceived performance).
          BrailleLoader freezes to a static frame under
          prefers-reduced-motion on its own. */}
      <BrailleLoader
        variant="chase"
        speed="fast"
        label={label}
        className="text-foreground"
      />
      <p className="text-muted-foreground text-sm">{label}…</p>
    </StateShell>
  )
}

interface PageErrorProps {
  message?: string
  onRetry?: () => void
}

export function PageError({
  message = "Something went wrong loading this view.",
  onRetry,
}: PageErrorProps) {
  const router = useRouter()
  return (
    <StateShell>
      <TriangleAlert className="text-destructive h-5 w-5" aria-hidden />
      <div>
        <p className="font-semibold">Couldn’t load this view</p>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry ?? (() => void router.invalidate())}>
        Try again
      </Button>
    </StateShell>
  )
}

interface PageNotFoundProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function PageNotFound({
  title = "Page not found",
  description = "That URL does not match any view.",
  action,
}: PageNotFoundProps) {
  return (
    <StateShell>
      <BrandLogo className="h-12 w-12 opacity-50" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {action}
    </StateShell>
  )
}
