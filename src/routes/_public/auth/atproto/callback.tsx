import AtprotoCallbackPage from "@/pages/atproto-callback-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/auth/atproto/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AtprotoCallbackPage />;
}
