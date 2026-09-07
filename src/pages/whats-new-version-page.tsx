import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, FileQuestion } from "lucide-react"
import { WhatsNewShell } from "@/components/whats-new/whats-new-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { changelogNeighbors, getChangelogEntry } from "@/lib/changelog"

/** Public per-version release notes, rendered from the compiled MDX. */
export default function WhatsNewVersionPage({ version }: { version: string }) {
  const entry = getChangelogEntry(version)
  const { prev, next } = changelogNeighbors(version)

  if (!entry) {
    return (
      <WhatsNewShell>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <FileQuestion className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground">No release notes for version {version}.</p>
          <Button variant="outline" render={<Link to="/whats-new" />}>
            <ArrowLeft className="h-4 w-4" />
            All updates
          </Button>
        </div>
      </WhatsNewShell>
    )
  }

  return (
    <WhatsNewShell activeVersion={entry.version}>
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <header className="relative">
          {/* Low-alpha radial glow behind the header — token-driven atmosphere */}
          <div
            aria-hidden
            className="bg-radial from-primary/10 to-transparent pointer-events-none absolute -inset-x-8 -top-12 h-56"
          />
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="bg-linear-to-br from-foreground via-primary to-chart-3 bg-clip-text relative inline-block text-6xl font-semibold tracking-tighter text-transparent lg:text-7xl"
          >
            v{entry.version}
          </motion.span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">
            {entry.title}
          </h1>
          <div className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
            <Badge variant="outline">v{entry.version}</Badge>
            <span className="font-mono">{entry.date}</span>
          </div>
        </header>

        <div className="prose prose-sm dark:prose-invert mt-10 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-code:font-medium prose-li:marker:text-muted-foreground/70">
          <entry.Component />
        </div>

        {(prev || next) && (
          <nav className="border-border mt-12 flex items-center justify-between border-t pt-6">
            {prev ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link to="/whats-new/$version" params={{ version: prev.version }} />}
              >
                <ArrowLeft className="h-4 w-4" />
                v{prev.version}
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link to="/whats-new/$version" params={{ version: next.version }} />}
              >
                v{next.version}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span />
            )}
          </nav>
        )}
      </motion.article>
    </WhatsNewShell>
  )
}
