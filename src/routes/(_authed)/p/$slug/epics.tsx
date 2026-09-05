import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/epics links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/epics")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/epics",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
