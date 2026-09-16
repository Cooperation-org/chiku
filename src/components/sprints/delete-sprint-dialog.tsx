import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteMilestone } from "@/lib/queries/milestones";
import { TaskSprintSelector } from "@/components/sprints/task-sprint-selector";
import type { Milestone, UserStory } from "@/lib/api/types";

/**
 * Delete a sprint. Unlike closing, the container is destroyed — so EVERY
 * story it holds (finished or not) moves to the destination first, defaulting
 * to the next open sprint and falling back to the backlog.
 */
export function DeleteSprintDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
  stories,
  destinations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  sprint: Milestone;
  stories: UserStory[];
  destinations: Pick<Milestone, "id" | "name" | "closed">[];
}) {
  const [destination, setDestination] = useState<number | null>(destinations[0]?.id ?? null);
  const remove = useDeleteMilestone(projectId);

  function commit() {
    const destinationId = destination;
    remove.mutate(
      { sprintId: sprint.id, stories, destinationId },
      {
        onSuccess: () => {
          const where = destinationId == null ? "the backlog" : "the selected sprint";
          toast.success(
            stories.length > 0
              ? `Sprint deleted — ${stories.length} ${stories.length === 1 ? "story" : "stories"} moved to ${where}`
              : "Sprint deleted",
          );
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete sprint"),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{sprint.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {stories.length > 0 ? (
              <>
                {stories.length} {stories.length === 1 ? "story" : "stories"} will move to{" "}
                <TaskSprintSelector
                  sprints={destinations}
                  value={destination}
                  onChange={setDestination}
                  ariaLabel="Move stories to"
                />{" "}
                (None = backlog). This can’t be undone — the sprint and its history are gone.
              </>
            ) : (
              "The sprint is empty. This can’t be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {stories.length > 0 && (
          <ul className="max-h-48 overflow-y-auto rounded border p-2 text-sm">
            {stories.slice(0, 20).map((s) => (
              <li key={s.id} className="truncate py-0.5">
                <span className="text-muted-foreground font-mono">#{s.ref}</span> {s.subject}
              </li>
            ))}
            {stories.length > 20 && (
              <li className="text-muted-foreground py-0.5">…and {stories.length - 20} more</li>
            )}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={commit} disabled={remove.isPending}>
            {remove.isPending ? "Deleting…" : "Delete sprint"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
