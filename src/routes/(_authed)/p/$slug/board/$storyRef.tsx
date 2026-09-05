import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/board/<ref> links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/board/$storyRef")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/board/$storyRef",
      params: { slug: params.slug, storyRef: params.storyRef },
      replace: true,
    })
  },
})
