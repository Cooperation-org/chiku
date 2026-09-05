import AccountPage from "@/pages/account-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/account/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountPage />;
}
