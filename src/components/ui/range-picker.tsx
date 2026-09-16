import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Canonical date-range picker (Base UI Popover + Calendar in `range` mode).
 *
 * All date-range picking should use this component — it is the single
 * source of truth for range selection. Single dates stay in
 * `@/components/ui/date-picker` (`DatePicker` + ISO string helpers).
 */

function TriggerLabel({
  label,
  placeholder,
  empty,
}: {
  label: string;
  placeholder: string;
  empty: boolean;
}) {
  return (
    <>
      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
      {empty ? placeholder : label}
    </>
  );
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  ariaLabel,
  className,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const empty = value?.from == null;
  const label =
    value?.from == null
      ? ""
      : value.to == null
        ? format(value.from, "PPP")
        : `${format(value.from, "LLL dd, y")} – ${format(value.to, "LLL dd, y")}`;
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
              empty && "text-muted-foreground",
              className,
            )}
          >
            <TriggerLabel label={label} placeholder={placeholder} empty={empty} />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
