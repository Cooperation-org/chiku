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
import { useCloseSprintAndRollover } from "@/lib/queries/milestones";
import { TaskSprintSelector } from "@/components/sprints/task-sprint-selector";
import type { Milestone, UserStory } from "@/lib/api/types";

/**
 * Close a sprint, moving unfinished stories first so nothing strands in a
 * closed sprint. The destination defaults to the next open sprint and falls
 * back to the backlog — the same promise the countdown badge makes.
 */
export function CloseSprintDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
  unfinished,
  rollover,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  sprint: Milestone;
  unfinished: UserStory[];
  rollover: Milestone | null;
}) {
  const [destination, setDestination] = useState<number | null>(rollover?.id ?? null);
  const close = useCloseSprintAndRollover(projectId);

  function commit() {
    const destinationId = destination;
    close.mutate(
      { sprintId: sprint.id, unfinished, destinationId },
      {
        onSuccess: () => {
          const where = destinationId == null ? "the backlog" : `“${rollover?.name ?? "next sprint"}”`;
          toast.success(
            unfinished.length > 0
              ? `Sprint closed — ${unfinished.length} unfinished ${unfinished.length === 1 ? "story" : "stories"} moved to ${where}`
              : "Sprint closed",
          );
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to close sprint"),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close “{sprint.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {unfinished.length > 0 ? (
              <>
                {unfinished.length} unfinished {unfinished.length === 1 ? "story" : "stories"} will
                move to{" "}
                <TaskSprintSelector
                  sprints={rollover ? [rollover] : []}
                  value={destination}
                  onChange={setDestination}
                  ariaLabel="Rollover destination"
                />{" "}
                (None = backlog). Finished work stays in the closed sprint for velocity history.
              </>
            ) : (
              "Every story is finished — nothing rolls over. Finished work stays for velocity history."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {unfinished.length > 0 && (
          <ul className="max-h-48 overflow-y-auto rounded border p-2 text-sm">
            {unfinished.slice(0, 20).map((s) => (
              <li key={s.id} className="truncate py-0.5">
                <span className="text-muted-foreground font-mono">#{s.ref}</span> {s.subject}
              </li>
            ))}
            {unfinished.length > 20 && (
              <li className="text-muted-foreground py-0.5">…and {unfinished.length - 20} more</li>
            )}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={commit} disabled={close.isPending}>
            {close.isPending ? "Closing…" : "Close sprint"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
