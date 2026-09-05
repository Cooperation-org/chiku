import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/(_authed)/projects/$slug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/board",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
