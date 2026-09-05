import TasksPage from "@/pages/tasks-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/tasks/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TasksPage />;
}
