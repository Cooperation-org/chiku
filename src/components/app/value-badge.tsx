import { cashUnit, parseCashValue, parseTeamValue, teamUnit } from "@/lib/values";
import type { UserStory } from "@/lib/api/types";
import { cn } from "cn";

/**
 * Pie-slicing value badge — team value (`cook`) + cash (`usd`) read off the
 * story's tags. Unvalued stories get an amber dot so the missing-value queue
 * is visible right on the board.
 */
export function ValueBadge({ story, className }: { story: UserStory; className?: string }) {
  const team = parseTeamValue(story.tags);
  const cash = parseCashValue(story.tags);
  if (team == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400",
          className,
        )}
        title="No pie-slicing value set — open the story to add one"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        No value
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 tabular-nums dark:text-emerald-400",
        className,
      )}
      title={`Pie-slicing value: ${team} ${teamUnit()}${cash != null ? ` + ${cash} ${cashUnit()} cash` : ""}`}
    >
      {team} {teamUnit()}
      {cash != null && cash > 0 && (
        <span className="opacity-80">
          +{cash} {cashUnit()}
        </span>
      )}
    </span>
  );
}
