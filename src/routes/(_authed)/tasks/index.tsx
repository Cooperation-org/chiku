import TasksPage from "@/pages/tasks-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbMyTasks } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/tasks/")({
  staticData: { toolbarBreadcrumbs: [CrumbMyTasks] },
  component: RouteComponent,
});

function RouteComponent() {
  return <TasksPage />;
}
