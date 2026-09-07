import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy shim: old /p/<slug>/members links land on the new shape.
export const Route = createFileRoute("/(_authed)/p/$slug/members")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/members",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
