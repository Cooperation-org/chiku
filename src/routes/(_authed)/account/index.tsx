import AccountPage from "@/pages/account-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbAccount } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/account/")({
  staticData: { toolbarBreadcrumbs: [CrumbAccount] },
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountPage />;
}
