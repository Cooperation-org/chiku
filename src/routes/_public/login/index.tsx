import LoginPage from "@/pages/login-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/login/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LoginPage />;
}
