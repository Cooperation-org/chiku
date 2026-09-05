import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/backlog links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/backlog")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/backlog",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
