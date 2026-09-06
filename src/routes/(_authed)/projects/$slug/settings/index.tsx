import { createFileRoute, redirect } from "@tanstack/react-router"

// /settings lands on General, GitLab-style.
export const Route = createFileRoute("/(_authed)/projects/$slug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$slug/settings/general",
      params: { slug: params.slug },
      replace: true,
    })
  },
})
