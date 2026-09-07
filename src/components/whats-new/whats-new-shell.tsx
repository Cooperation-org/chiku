import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { changelogEntries } from "@/lib/changelog"
import { cn } from "cn"

function TimelineRail({ activeVersion }: { activeVersion?: string }) {
  return (
    <nav aria-label="Releases" className="relative">
      {/* Hairline connector behind the dots */}
      <div aria-hidden className="bg-border absolute top-2 bottom-3 left-[7px] w-px" />
      <ul className="space-y-5">
        {changelogEntries.map((entry) => {
          const active = entry.version === activeVersion
          return (
            <li key={entry.version}>
              <Link
                to="/whats-new/$version"
                params={{ version: entry.version }}
                className="group flex items-start gap-3"
              >
                <span className="relative mt-1.5 flex size-3.5 shrink-0 items-center justify-center">
                  {active && (
                    <span aria-hidden className="bg-primary/30 absolute inset-0 rounded-full blur-[3px]" />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "border-border bg-background relative size-2.5 rounded-full border-2 transition-colors",
                      active
                        ? "border-primary bg-primary"
                        : "group-hover:border-primary/60 group-hover:bg-primary/40"
                    )}
                  />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block font-mono text-sm transition-colors",
                      active
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    v{entry.version}
                  </span>
                  <span className="text-muted-foreground/80 block text-xs">{entry.date}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function VersionChips({ activeVersion }: { activeVersion?: string }) {
  return (
    <nav aria-label="Releases" className="-mx-6 overflow-x-auto px-6 pb-1 lg:hidden">
      <div className="flex w-max gap-2">
        {changelogEntries.map((entry) => {
          const active = entry.version === activeVersion
          return (
            <Link
              key={entry.version}
              to="/whats-new/$version"
              params={{ version: entry.version }}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-sm whitespace-nowrap transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              v{entry.version}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * The bold changelog shell: a sticky release timeline rail beside the
 * content pane (mobile: horizontal chip strip). All color comes from design
 * tokens — primary, chart, border — never literal values.
 */
export function WhatsNewShell({
  activeVersion,
  children,
}: {
  activeVersion?: string
  children: ReactNode
}) {
  return (
    <div className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-14">
              <Button
                variant="ghost"
                size="sm"
                render={<Link to="/" />}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to app
              </Button>

              <div className="mt-6">
                <h2 className="text-lg font-semibold tracking-tight">
                  What&rsquo;s new
                </h2>
                {/* Gradient hairline rule */}
                <div aria-hidden className="mt-3 h-px bg-linear-to-r from-primary/60 via-border to-transparent" />
              </div>

              <div className="mt-8">
                <TimelineRail activeVersion={activeVersion} />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              render={<Link to="/" />}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to app
            </Button>
            <VersionChips activeVersion={activeVersion} />
          </div>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
