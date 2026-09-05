import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/board?story=<ref> dashboard links land on the
// canonical /projects/<slug>/board/<ref> shape.
type BoardSearch = { story?: number }

export const Route = createFileRoute("/(_authed)/p/$slug/board/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const raw = search.story
    if (raw === undefined || raw === null || raw === "") return {}
    const story = Number(raw)
    return Number.isFinite(story) ? { story } : {}
  },
  beforeLoad: ({ params, search }) => {
    const { story } = search as BoardSearch
    throw redirect({
      to:
        story !== undefined
          ? "/projects/$slug/board/$storyRef"
          : "/projects/$slug/board",
      params:
        story !== undefined
          ? { slug: params.slug, storyRef: String(story) }
          : { slug: params.slug },
      replace: true,
    })
  },
})
