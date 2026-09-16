import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * shadcn date pickers (Base UI Popover + Calendar), following
 * https://ui.shadcn.com/docs/components/base/date-picker — the single-date
 * variant lives here. Range picking lives in
 * `@/components/ui/range-picker` (`DateRangePicker`); it is re-exported
 * below for backward compatibility. Values are `Date | undefined` /
 * `DateRange | undefined`; the YYYY-MM-DD string helpers below bridge to
 * the Taiga API and URL params.
 */
export { DateRangePicker } from "@/components/ui/range-picker";

/** `Date` → `YYYY-MM-DD` in local time (no UTC shift). */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` → local-midnight `Date`, or undefined when blank/invalid. */
export function parseISODateString(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  ariaLabel,
  className,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The trigger must be a prop-forwarding Button (not a custom wrapper)
          so Base UI can attach its open/close handlers and ref to it. */}
      <PopoverTrigger
        aria-label={ariaLabel ?? placeholder}
        render={
          <Button
            variant="outline"
            className={cn(
              "h-8 justify-start text-left text-xs font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {value ? format(value, "PPP") : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            if (d) setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
