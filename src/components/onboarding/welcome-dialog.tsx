import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Check, Coins, LayoutDashboard, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { brand, wordmarkParts } from "@/lib/brand"
import { shouldAutoOpenOnboarding, useOnboardingStore } from "@/lib/stores/onboarding"
import { cn } from "cn"

const STEPS = [
  {
    icon: LayoutDashboard,
    eyebrow: "Welcome",
    title: "Where work becomes ownership",
    body: "Chiku is the fast board for worker-owned teams. Plan in the backlog, work the board, close sprints — peer-reviewed work turns into equity from day one.",
    bullets: ["Kanban board with drag-and-drop", "Backlog + epics + velocity", "Deep links that survive sign-in"],
  },
  {
    icon: Coins,
    eyebrow: "Step 1 of your workflow",
    title: "Every story carries its value",
    body: "Each story shows a pie-slicing badge in slices. Your venture names its own units, and GovKit picks the value up on the next sync.",
    bullets: ["Value badge right on the card", "Per-venture units in slices", "Missing value glows amber until set"],
  },
  {
    icon: Rocket,
    eyebrow: "Step 2 of your workflow",
    title: "Ship the sprint, keep the proof",
    body: "Scope the board to a sprint, close with rollover so nothing strands, and talk it through with @mentions, quote-replies, and the notifications bell.",
    bullets: ["Sprints with close + rollover", "@mentions, replies, member profiles", "What's new ships every version"],
  },
] as const

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === step ? "bg-primary w-5" : "bg-border w-1.5",
          )}
        />
      ))}
    </div>
  )
}

/**
 * First-run welcome tour. Auto-opens once per browser for signed-in visitors
 * (never on story/sprint deep links), re-openable for screenshots with
 * `?onboarding=preview` on any authed URL.
 */
export function WelcomeDialog() {
  const open = useOnboardingStore((s) => s.open)
  const step = useOnboardingStore((s) => s.setStep)
  const current = useOnboardingStore((s) => s.step)
  const setOpen = useOnboardingStore((s) => s.setOpen)
  const dismiss = useOnboardingStore((s) => s.dismiss)

  useEffect(() => {
    if (shouldAutoOpenOnboarding()) {
      setOpen(true)
    }
    // Run once on mount — open state is user-driven after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clamped = Math.min(Math.max(current, 0), STEPS.length - 1)
  const active = STEPS[clamped]
  const Icon = active.icon
  const last = clamped === STEPS.length - 1
  const { base, accent } = wordmarkParts()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss(true)
        else setOpen(true)
      }}
    >
      <DialogContent className="p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-5 pb-0 text-left">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {brand.active ? (
              <span>
                {base}
                {accent && <span className="text-primary">{accent}</span>}
                {" · "}
              </span>
            ) : null}
            {active.eyebrow}
          </p>
          <DialogTitle className="mt-1 flex items-center gap-2.5 text-xl">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-5" />
            </span>
            {active.title}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[15px] leading-relaxed">
            {active.body}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 px-6 py-4">
          {active.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Mock value badge row — the LinkedIn hero detail */}
        {clamped === 1 && (
          <div className="mx-6 mb-1 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
              50 slices
            </span>
            <span className="text-muted-foreground">lands on the story&apos;s tags → GovKit sync</span>
          </div>
        )}

        <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-2 px-6 py-4 sm:justify-between">
          <StepDots step={clamped} total={STEPS.length} />
          <div className="flex items-center gap-2">
            {clamped > 0 && (
              <Button variant="ghost" size="sm" onClick={() => step(clamped - 1)}>
                <ArrowLeft />
                Back
              </Button>
            )}
            {!last ? (
              <Button size="sm" onClick={() => step(clamped + 1)}>
                Next
                <ArrowRight />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link to="/whats-new" onClick={() => dismiss(true)}>
                      What&apos;s new
                    </Link>
                  }
                />
                <Button size="sm" onClick={() => dismiss(true)}>
                  Open board
                  <ArrowRight />
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
