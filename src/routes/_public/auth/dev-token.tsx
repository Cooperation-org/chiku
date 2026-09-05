import DevTokenPage from "@/pages/dev-token-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/auth/dev-token")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DevTokenPage />;
}
