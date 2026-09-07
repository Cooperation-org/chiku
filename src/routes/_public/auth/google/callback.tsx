import GoogleCallbackPage from "@/pages/google-callback-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/auth/google/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GoogleCallbackPage />;
}
