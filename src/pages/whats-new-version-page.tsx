import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, FileQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  changelogNeighbors,
  getChangelogEntry,
} from "@/lib/changelog"

/** Public per-version release notes, rendered from the compiled MDX. */
export default function WhatsNewVersionPage({ version }: { version: string }) {
  const entry = getChangelogEntry(version)
  const { prev, next } = changelogNeighbors(version)

  if (!entry) {
    return (
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <FileQuestion className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground">No release notes for version {version}.</p>
        <Button variant="outline" render={<Link to="/whats-new" />}>
          <ArrowLeft className="h-4 w-4" />
          All updates
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-dvh">
      <article className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="space-y-2">
          <Button variant="ghost" size="sm" render={<Link to="/whats-new" />}>
            <ArrowLeft className="h-4 w-4" />
            All updates
          </Button>
          <h1 className="text-3xl font-semibold">{entry.title}</h1>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Badge variant="outline">v{entry.version}</Badge>
            <span>{entry.date}</span>
          </div>
        </header>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <entry.Component />
        </div>

        {(prev || next) && (
          <nav className="flex items-center justify-between border-t pt-4">
            {prev ? (
              <Button variant="outline" size="sm" render={<Link to="/whats-new/$version" params={{ version: prev.version }} />}>
                <ArrowLeft className="h-4 w-4" />
                v{prev.version}
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button variant="outline" size="sm" render={<Link to="/whats-new/$version" params={{ version: next.version }} />}>
                v{next.version}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span />
            )}
          </nav>
        )}
      </article>
    </div>
  )
}
