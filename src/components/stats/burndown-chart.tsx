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
 */
export function BurndownChart({ stats }: { stats: MilestoneStats }) {
  const definition = useMemo(() => {
    const rows = stats.days.map((d) => ({
      day: d.day,
      open: d.open_points,
      optimal: d.optimal_points,
    }))
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
        x: { scale: () => scalePoint<string>().padding(0.25) },
        y: {
          scale: scaleLinear,
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
