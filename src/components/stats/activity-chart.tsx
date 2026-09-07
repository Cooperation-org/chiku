import { useMemo } from "react"
import { barY, colorLegend, defineChart, stack } from "@tanstack/charts"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@tanstack/charts/react"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"

/**
 * 28-day issue activity — opened vs closed per day as a stacked bar series.
 * Dates are derived backwards from today to match the API's window.
 */
export function IssueActivityChart({
  open,
  closed,
}: {
  open: number[]
  closed: number[]
}) {
  const definition = useMemo(() => {
    const today = new Date()
    const labels: string[] = []
    const rows: { day: string; series: string; count: number }[] = []
    for (let i = 0; i < open.length; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - (open.length - 1 - i))
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      labels.push(label)
      rows.push({ day: label, series: "Opened", count: open[i] })
      rows.push({ day: label, series: "Closed", count: closed[i] })
    }
    return defineChart({
      marks: [
        barY(rows, {
          x: "day",
          y: "count",
          z: "series",
          color: "series",
          layout: stack({ order: ["Opened", "Closed"] }),
          inset: 1,
        }),
      ],
      scales: {
        x: { scale: () => scaleBand<string>().domain(labels).padding(0.25) },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: "Issues" },
        },
      },
      color: {
        domain: ["Opened", "Closed"],
        range: ["var(--primary)", "#10b981"],
        legend: colorLegend({ label: "Issue events" }),
      },
      tooltip,
    })
  }, [open, closed])

  return (
    <Chart
      definition={definition}
      height={220}
      ariaLabel="Issues opened and closed over the last four weeks"
      ariaDescription="Daily count of opened and closed issues over the last 28 days"
    />
  )
}
