import { useMemo } from "react"
import {
  defineChart,
  lineY,
  ruleY,
} from "@tanstack/charts"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@tanstack/charts/react"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { scalePoint } from "@tanstack/charts/scales/point"
import type { MilestoneStats } from "@/lib/api/types"

/**
 * Sprint burndown: actual remaining points against the ideal slope, from
 * GET /milestones/{id}/stats. Colors are CSS tokens so the chart follows the
 * theme (and any deployment brand) automatically.
 *
 * Readability rules: the y domain always starts at 0 (never a negative
 * stub), x labels are short month/day pairs, and the series legend lives in
 * the card as HTML — not in the chart definition.
 */
export function BurndownChart({ stats }: { stats: MilestoneStats }) {
  const definition = useMemo(() => {
    const rows = stats.days.map((d) => ({
      day: d.day,
      open: d.open_points,
      optimal: d.optimal_points,
    }))
    const peak = Math.max(1, ...rows.flatMap((r) => [r.open, r.optimal]))
    return defineChart({
      marks: [
        // The ideal line is context — painted but not interactive.
        lineY(rows, {
          x: "day",
          y: "optimal",
          stroke: "var(--muted-foreground)",
          strokeWidth: 1.5,
          strokeDasharray: "4 4",
          points: false,
        }),
        ruleY([0], { stroke: "var(--border)" }),
        lineY(rows, {
          x: "day",
          y: "open",
          stroke: "var(--primary)",
          strokeWidth: 2,
          points: true,
        }),
      ],
      scales: {
        x: {
          scale: () => scalePoint<string>().padding(0.25),
          axis: { ticks: { format: (day: string) => shortDay(day) } },
        },
        y: {
          // Configured instance (not the factory): owns the domain so the
          // floor stays 0 no matter how flat the sprint is.
          scale: scaleLinear().domain([0, Math.ceil(peak)]),
          nice: true,
          grid: true,
          axis: { label: "Open points" },
        },
      },
      tooltip,
    })
  }, [stats])

  return (
    <Chart
      definition={definition}
      height={260}
      ariaLabel={`Burndown for ${stats.name}`}
      ariaDescription="Remaining points per day against the ideal trend"
    />
  )
}

/** "2026-09-17" → "Sep 17"; falls back to the raw value when unparseable. */
function shortDay(day: string): string {
  const d = new Date(`${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString("en", { month: "short", day: "numeric" })
}
