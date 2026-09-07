import { useMemo } from "react"
import { barX, defineChart } from "@tanstack/charts"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@tanstack/charts/react"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import type { IssueStatBin } from "@/lib/api/types"

/**
 * Horizontal issue distribution — each bar painted with the color the Taiga
 * API already carries for that status/priority/severity/type, so the chart
 * agrees with the board's own colors.
 */
export function IssueDistributionChart({
  rows,
  label,
}: {
  rows: IssueStatBin[]
  label: string
}) {
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
          axis: { label: "Issues" },
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
      ariaLabel={`Issues per ${label}`}
      ariaDescription={`Count of issues per ${label}`}
    />
  )
}
