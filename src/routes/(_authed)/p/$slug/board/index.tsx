import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/board?story=<ref> dashboard links land on the
// canonical /projects/<slug>/board/<ref> shape. Text filter (?q=) and sprint
// scope (?sprint=) pass through so shared links keep working.
type BoardSearch = { story?: number; q?: string; sprint?: string }

export const Route = createFileRoute("/(_authed)/p/$slug/board/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const out: BoardSearch = {}
    const raw = search.story
    if (raw === undefined || raw === null || raw === "") {
      if (typeof search.q === "string" && search.q !== "") out.q = search.q
      if (typeof search.sprint === "string" && search.sprint !== "") out.sprint = search.sprint
      return out
    }
    const story = Number(raw)
    if (Number.isFinite(story)) out.story = story
    if (typeof search.q === "string" && search.q !== "") out.q = search.q
    if (typeof search.sprint === "string" && search.sprint !== "") out.sprint = search.sprint
    return out
  },
  beforeLoad: ({ params, search }) => {
    const { story, q, sprint } = search as BoardSearch
    throw redirect({
      to:
        story !== undefined
          ? "/projects/$slug/board/$storyRef"
          : "/projects/$slug/board",
      params:
        story !== undefined
          ? { slug: params.slug, storyRef: String(story) }
          : { slug: params.slug },
      search: { q, sprint },
      replace: true,
    })
  },
})
