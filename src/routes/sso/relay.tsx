import SsoRelayPage from "@/pages/sso-relay-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sso/relay")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SsoRelayPage />;
}
