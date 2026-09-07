import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { ArrowRight, Sparkles } from "lucide-react"
import { WhatsNewShell } from "@/components/whats-new/whats-new-shell"
import { Badge } from "@/components/ui/badge"
import { changelogEntries, latestVersion } from "@/lib/changelog"
import { cn } from "cn"

/** Public changelog index — editorial release rows, newest first. */
export default function WhatsNewPage() {
  const latest = latestVersion()

  return (
    <WhatsNewShell>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          Release notes
        </h1>
        <p className="text-muted-foreground">Every shipped version, newest first.</p>
      </div>

      <div className="mt-10">
        {changelogEntries.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center">No releases yet.</div>
        ) : (
          <ol className="space-y-10">
            {changelogEntries.map((entry, i) => (
              <motion.li
                key={entry.version}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 26 }}
                className={cn(i > 0 && "border-border border-t pt-10")}
              >
                <Link to="/whats-new/$version" params={{ version: entry.version }} className="group block">
                  <div className="flex items-baseline gap-5 lg:gap-8">
                    {/* Signature element: gradient-clipped version numeral */}
                    <span
                      aria-hidden
                      className="inline-block bg-linear-to-br from-foreground via-primary to-chart-3 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent transition-opacity group-hover:opacity-90 lg:text-6xl"
                    >
                      {entry.version}
                    </span>
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
                        {entry.title}
                        {entry.version === latest && (
                          <Badge>
                            <Sparkles className="h-3 w-3" />
                            Latest
                          </Badge>
                        )}
                      </h2>
                      <p className="text-muted-foreground mt-1 font-mono text-sm">{entry.date}</p>
                      <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
                        Read the notes
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </WhatsNewShell>
  )
}
