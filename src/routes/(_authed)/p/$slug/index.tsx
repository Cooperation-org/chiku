import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug> links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/board",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
