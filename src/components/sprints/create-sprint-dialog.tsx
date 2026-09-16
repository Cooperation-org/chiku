import { useState } from "react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/range-picker";
import { toISODateString } from "@/components/ui/date-picker";
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
import { useCreateMilestone } from "@/lib/queries/milestones";

function todayPlus(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Sprint creation — name plus a start/finish window (the deadline). */
export function CreateSprintDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}) {
  const [name, setName] = useState("");
  const [range, setRange] = useState<DateRange | undefined>({
    from: todayPlus(0),
    to: todayPlus(14),
  });
  const create = useCreateMilestone(projectId);

  function commit() {
    if (!name.trim()) {
      toast.error("A sprint needs a name.");
      return;
    }
    if (range?.from == null || range?.to == null) {
      toast.error("Pick a start and finish date for the sprint.");
      return;
    }
    const start = toISODateString(range.from);
    const finish = toISODateString(range.to);
    if (finish < start) {
      toast.error("The finish date must be on or after the start date.");
      return;
    }
    create.mutate(
      { name: name.trim(), estimated_start: start, estimated_finish: finish },
      {
        onSuccess: () => {
          toast.success(`Sprint "${name.trim()}" created`);
          setName("");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create sprint"),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New sprint</AlertDialogTitle>
          <AlertDialogDescription>
            A timeboxed iteration. Plan backlog stories into it, work it on the board, then close it —
            unfinished stories roll over to the next sprint.
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
          <AlertDialogAction onClick={commit} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create sprint"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
