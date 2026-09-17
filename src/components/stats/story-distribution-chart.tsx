import { useMemo } from "react"
import { barX, defineChart } from "@tanstack/charts"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@tanstack/charts/react"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import type { StoryStatusRow } from "@/lib/story-stats"

/**
 * Horizontal story distribution — one bar per board status, painted with
 * the status color so the chart agrees with the board's own columns.
 * Prepared rows come from `groupStoriesByStatus` (TanStack Query data is
 * the single owner; this mark only encodes the summary projection).
 */
export function StoryDistributionChart({ rows }: { rows: StoryStatusRow[] }) {
  const definition = useMemo(() => {
    const domain = rows.map((row) => row.name)
    return defineChart({
      marks: [
        barX(rows, {
          x: "count",
          y: "name",
          fill: (row) => row.color,
          inset: 2,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: "Stories" },
        },
        y: { scale: () => scaleBand<string>().domain(domain).padding(0.24) },
      },
      tooltip,
    })
  }, [rows])

  return (
    <Chart
      definition={definition}
      height={Math.max(160, rows.length * 40)}
      ariaLabel="Stories per status"
      ariaDescription="Count of stories per board status"
    />
  )
}
