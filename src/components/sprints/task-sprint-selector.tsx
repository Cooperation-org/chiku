import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Milestone } from "@/lib/api/types";
import { cn } from "cn";

const NONE = "none";

/**
 * Reusable sprint picker — backlog table cells and the story view share it.
 * Unassigned stories read "None" (never "Backlog" as a value); the menu
 * offers None plus every sprint passed in. Callers decide the set: open
 * sprints for planning surfaces, all sprints for the story view (closed ones
 * render disabled).
 */
export function TaskSprintSelector({
  sprints,
  value,
  onChange,
  size = "sm",
  className,
  ariaLabel = "Sprint",
  stopPropagation = false,
}: {
  sprints: Pick<Milestone, "id" | "name" | "closed">[];
  value: number | null;
  onChange: (milestoneId: number | null) => void;
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
  /** Swallow clicks so table-row navigation doesn't fire when picking. */
  stopPropagation?: boolean;
}) {
  // Resolve value → label in the trigger (never shows raw ids), following the
  // OptionsSelect convention. Unknown ids (deleted sprint) fall back to None.
  const selected = value == null ? undefined : sprints.find((s) => s.id === value);
  return (
    <Select
      value={value == null ? null : String(value)}
      onValueChange={(v) => onChange(v === NONE ? null : Number(v))}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn("max-w-44", className)}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {selected ? (
          <span className="truncate">
            {selected.name}
            {selected.closed ? " (closed)" : ""}
          </span>
        ) : (
          <SelectValue placeholder="None" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {sprints.map((s) => (
          <SelectItem key={s.id} value={String(s.id)} disabled={s.closed}>
            {s.name}
            {s.closed ? " (closed)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
