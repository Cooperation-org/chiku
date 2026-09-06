import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/settings links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/settings")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/settings",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
