import { Link } from "@tanstack/react-router"
import { ArrowRight, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { changelogEntries, latestVersion } from "@/lib/changelog"

/** Public changelog index — newest release first. */
export default function WhatsNewPage() {
  const latest = latestVersion()

  return (
    <div className="bg-background min-h-dvh">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Sparkles className="text-primary h-6 w-6" />
              What&rsquo;s new
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Release notes for every shipped version, newest first.
            </p>
          </div>
          <Button variant="ghost" render={<Link to="/login" />}>
            Back to app
          </Button>
        </header>

        {changelogEntries.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center">No releases yet.</div>
        ) : (
          <div className="space-y-4">
            {changelogEntries.map((entry) => (
              <Link
                key={entry.version}
                to="/whats-new/$version"
                params={{ version: entry.version }}
                className="hover:bg-accent/40 block rounded-xl transition-colors"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {entry.title}
                      {entry.version === latest && (
                        <Badge className="shrink-0">
                          <Sparkles className="h-3 w-3" />
                          Latest
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Version {entry.version} · {entry.date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
                      Read the release notes
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
