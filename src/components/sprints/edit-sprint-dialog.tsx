import { useState } from "react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/range-picker";
import { parseISODateString, toISODateString } from "@/components/ui/date-picker";
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
import { useUpdateMilestone } from "@/lib/queries/milestones";
import { validateSprintInput } from "@/lib/sprints";
import type { Milestone } from "@/lib/api/types";

/** Rename / reschedule a sprint. Mounted conditionally, so prop initializers are fresh per open. */
export function EditSprintDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  sprint: Milestone;
}) {
  const [name, setName] = useState(sprint.name);
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseISODateString(sprint.estimated_start),
    to: parseISODateString(sprint.estimated_finish),
  });
  const update = useUpdateMilestone(projectId);

  function commit() {
    const problem = validateSprintInput(name, range?.from, range?.to);
    if (problem) {
      toast.error(problem);
      return;
    }
    update.mutate(
      {
        id: sprint.id,
        data: {
          name: name.trim(),
          estimated_start: toISODateString(range!.from!),
          estimated_finish: toISODateString(range!.to!),
        },
      },
      {
        onSuccess: () => {
          toast.success(`Sprint "${name.trim()}" updated`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update sprint"),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit sprint</AlertDialogTitle>
          <AlertDialogDescription>
            Rename or reschedule “{sprint.name}”. Stories stay where they are — only the
            window changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 12" autoFocus />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Dates (finish is the deadline)</span>
            <DateRangePicker value={range} onChange={setRange} ariaLabel="Sprint dates" />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={commit} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
