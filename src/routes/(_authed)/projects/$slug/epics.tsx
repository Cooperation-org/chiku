import EpicsPage from "@/pages/epics-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbEpics } from "@/components/layout/breadcrumbs";
import { EpicsToolbarControls } from "@/components/epics/epics-toolbar-controls";

export const Route = createFileRoute("/(_authed)/projects/$slug/epics")({
  staticData: {
    toolbarBreadcrumbs: [CrumbEpics],
    toolbarControls: [EpicsToolbarControls],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <EpicsPage slug={slug} />;
}
