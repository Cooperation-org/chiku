import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { PAGE_EASE_OUT } from "@/lib/motion"

/** Non-blocking crossfade for loading ⇄ content ⇄ error swaps inside a page. */
export function PagePresence({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      {children}
    </AnimatePresence>
  )
}

interface PageTransitionProps {
  children: ReactNode
  /** Stable key segment — remounts (replaying enter) when it changes. */
  transitionKey?: string | number
}

/**
 * Enter-only page transition: fade + 8px rise over 220ms.
 *
 * Purpose (animate §2): preventing a jarring change on occasional-tier
 * navigation. Full `transform` strings — never Motion's `x`/`y` shorthands —
 * so the enter stays on the GPU while the browser is busy loading the page.
 * Presence-ready: the opacity-only exit lets a future layout-level
 * AnimatePresence crossfade without reflow jank.
 */
export function PageTransition({ children, transitionKey }: PageTransitionProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      key={transitionKey}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
      exit={{ opacity: 0 }}
      transition={
        reduce
          ? { duration: 0.15, ease: "easeOut" }
          : { duration: 0.22, ease: PAGE_EASE_OUT }
      }
      className="h-full"
    >
      {children}
    </motion.div>
  )
}
