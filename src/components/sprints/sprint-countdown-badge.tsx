import { formatSprintCountdown, getSprintUrgency } from "@/lib/sprints";
import type { Milestone } from "@/lib/api/types";
import { cn } from "cn";

/**
 * Sprint deadline badge. Turns amber within 24h of `estimated_finish` and red
 * past it, naming where unfinished work will roll over — the visual promise
 * that closing moves leftovers to the next sprint (or backlog).
 */
export function SprintCountdownBadge({
  sprint,
  unfinishedCount,
  rolloverName,
  className,
}: {
  sprint: Pick<Milestone, "closed" | "estimated_finish" | "name">;
  unfinishedCount?: number;
  rolloverName?: string | null;
  className?: string;
}) {
  const urgency = getSprintUrgency(sprint);
  const countdown = formatSprintCountdown(sprint);
  const showRollover =
    unfinishedCount != null && unfinishedCount > 0 && urgency !== "closed" && urgency !== "none";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        urgency === "closed" && "bg-muted text-muted-foreground",
        urgency === "ok" && "bg-muted text-muted-foreground",
        urgency === "none" && "bg-muted text-muted-foreground",
        urgency === "warning" &&
          "animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400",
        urgency === "overdue" && "bg-destructive/10 text-destructive",
        className,
      )}
      title={
        showRollover
          ? `${unfinishedCount} unfinished ${unfinishedCount === 1 ? "story" : "stories"} will move to ${rolloverName ?? "the backlog"} on close`
          : countdown
      }
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {countdown}
      {showRollover && (
        <span className="opacity-80">
          · {unfinishedCount} unfinished → {rolloverName ?? "backlog"}
        </span>
      )}
    </span>
  );
}
