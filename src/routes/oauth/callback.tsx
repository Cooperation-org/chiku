import OauthCallbackPage from "@/pages/oauth-callback-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OauthCallbackPage />;
}
