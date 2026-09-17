import { parseProjectCashValue, parseProjectTeamValue, useProjectUnits, type ProjectUnits } from "@/lib/project-units";
import type { UserStory } from "@/lib/api/types";
import { cn } from "cn";

/**
 * Pie-slicing value badge — team value + cash read off the story's tags.
 * Units resolve per venture (`value-team:*` / `value-cash:*` project tags,
 * defaulting to cook/usd); an explicit `units` prop wins and skips the
 * project lookup (story modal, previews). Unvalued stories get an amber dot
 * so the missing-value queue is visible right on the board.
 */
export function ValueBadge({ story, units, className }: { story: UserStory; units?: ProjectUnits; className?: string }) {
  if (units) return <ValueBadgeView story={story} units={units} className={className} />;
  return <ValueBadgeAuto story={story} className={className} />;
}

function ValueBadgeAuto({ story, className }: { story: UserStory; className?: string }) {
  const units = useProjectUnits(story.project);
  return <ValueBadgeView story={story} units={units} className={className} />;
}

function ValueBadgeView({ story, units, className }: { story: UserStory; units: ProjectUnits; className?: string }) {
  const team = parseProjectTeamValue(story.tags, units);
  const cash = parseProjectCashValue(story.tags, units);
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
      title={`Pie-slicing value: ${team} ${units.team}${cash != null ? ` + ${cash} ${units.cash} cash` : ""}`}
    >
      {team} {units.team}
      {cash != null && cash > 0 && (
        <span className="opacity-80">
          +{cash} {units.cash}
        </span>
      )}
    </span>
  );
}
