import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/sprints links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/sprints")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/sprints",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
