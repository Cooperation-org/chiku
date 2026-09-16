import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link } from "@tanstack/react-router"
import { memberPath } from "@/lib/api/users"
import { mentionUsername } from "@/lib/mentions"
import { remarkTaigaRefs } from "@/lib/taiga-refs"
import { cn } from "cn"

/**
 * Runtime markdown for Taiga content (descriptions, comments, attachment
 * previews) — renders to React elements, so untrusted text never touches
 * `dangerouslySetInnerHTML`. Raw HTML embedded in content is ignored.
 * GFM adds tables/task lists; `remarkTaigaRefs` handles Taiga references.
 *
 * When `projectSlug` is set, @mention chips link to that project member's
 * profile page; otherwise they render as plain chips.
 */
export function Markdown({
  source,
  className,
  projectSlug,
}: {
  source: string
  className?: string
  projectSlug?: string
}) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkTaigaRefs, remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("/") ? (
              <Link to={href as never}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          em: ({ node, children }) => {
            const flagged = (
              (node?.data as Record<string, unknown> | undefined)?.hProperties as
                | Record<string, unknown>
                | undefined
            )?.["data-mention"]
            if (!flagged) return <em>{children}</em>
            const chip = (
              <span className="text-primary rounded bg-primary/10 px-1 py-0.5 font-medium">
                {children}
              </span>
            )
            const username = mentionUsername(children)
            if (username && projectSlug) {
              return (
                <Link
                  to={memberPath(projectSlug, username) as never}
                  title={`View ${username}'s profile`}
                >
                  {chip}
                </Link>
              )
            }
            return chip
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
