import { AnimatePresence, motion } from "motion/react"
import { Check, Cloud, CloudOff, TriangleAlert } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSyncStatus } from "@/hooks/use-sync-status"
import { cn } from "cn"

type SyncGlyph = "idle" | "syncing" | "queued" | "success" | "error"

const GLYPH_CLASS: Record<SyncGlyph, string> = {
  idle: "text-muted-foreground",
  syncing: "text-blue-500",
  queued: "text-amber-500",
  success: "text-emerald-500",
  error: "text-destructive",
}

/**
 * Static sync indicator. The glyph crossfades with a rotate/scale/blur
 * morph; `syncing`/`queued` loop an ongoing animation (rotating orbit ring
 * + breathing glyph) that stops dead the moment everything settles.
 */
export function SyncStatus() {
  const { display, pendingCount, online, message } = useSyncStatus()

  const glyph: SyncGlyph =
    display === "active" ? (online ? "syncing" : "queued") : display

  const label =
    glyph === "syncing"
      ? `Syncing… ${pendingCount} in flight`
      : glyph === "queued"
        ? `Waiting for connection… ${pendingCount} queued`
        : glyph === "success"
          ? "All changes synced"
          : glyph === "error"
            ? message ? `Sync failed: ${message}` : "Sync failed"
            : "All caught up"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            aria-label={`Sync status: ${label}`}
            className="relative flex size-9 items-center justify-center rounded-md"
          />
        }
      >
        {/* Orbit ring — only while syncing, fades out on settle. */}
        <AnimatePresence initial={false}>
          {glyph === "syncing" && (
            <motion.span
              key="orbit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-blue-500 absolute inset-1"
              aria-hidden
            >
              <motion.svg
                viewBox="0 0 36 36"
                className="size-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="7 9"
                  strokeLinecap="round"
                />
              </motion.svg>
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={glyph}
            initial={{ opacity: 0, scale: 0.4, rotate: -60, filter: "blur(4px)" }}
            animate={
              glyph === "syncing"
                ? { opacity: [1, 0.35, 1], scale: [1, 0.8, 1], rotate: 0, filter: "blur(0px)" }
                : glyph === "queued"
                  ? { opacity: [1, 0.5, 1], scale: 1, rotate: 0, filter: "blur(0px)" }
                  : glyph === "error"
                    ? { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", x: [0, -4, 4, -3, 2, 0] }
                    : { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }
            }
            exit={{ opacity: 0, scale: 0.4, rotate: 60, filter: "blur(4px)" }}
            transition={
              glyph === "syncing"
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : glyph === "queued"
                  ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                  : { type: "spring", stiffness: 550, damping: 26 }
            }
            className={cn("flex", GLYPH_CLASS[glyph])}
          >
            {glyph === "success" ? (
              <Check className="h-4 w-4" />
            ) : glyph === "error" ? (
              <TriangleAlert className="h-4 w-4" />
            ) : glyph === "queued" ? (
              <CloudOff className="h-4 w-4" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
