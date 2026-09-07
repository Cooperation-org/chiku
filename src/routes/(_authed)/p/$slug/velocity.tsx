import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/velocity links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/velocity")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/velocity",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
