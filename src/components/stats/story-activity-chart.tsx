import { useMemo } from "react"
import { barY, colorLegend, defineChart, stack } from "@tanstack/charts"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@tanstack/charts/react"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"

/**
 * 28-day story activity — created vs completed per day as a stacked bar
 * series. Labels are derived backwards from today to match the API-style
 * trailing window used by the issue chart.
 */
export function StoryActivityChart({
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
          axis: { label: "Stories" },
        },
      },
      color: {
        domain: ["Opened", "Closed"],
        range: ["var(--primary)", "#10b981"],
        legend: colorLegend({ label: "Story events" }),
      },
      tooltip,
    })
  }, [open, closed])

  return (
    <Chart
      definition={definition}
      height={220}
      ariaLabel="Stories opened and closed over the last four weeks"
      ariaDescription="Daily count of created and completed stories over the last 28 days"
    />
  )
}
