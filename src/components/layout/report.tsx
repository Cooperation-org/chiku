import { motion, useReducedMotion } from "motion/react"
import { PAGE_EASE_OUT } from "@/lib/motion"

/**
 * The editorial "precision report" kit, shared by the retouched pages:
 * a masthead kicker (identity lives in the toolbar; the page opens with a
 * letterspaced kicker, a hairline rule and a small context tag) and open
 * hero figures — oversized tabular numerals separated by hairline column
 * rules, staggered on load, with optional animated progress hairlines.
 */

export function ReportMasthead({
  kicker,
  tag,
  action,
}: {
  kicker: string
  tag?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
        {kicker}
      </span>
      <span className="bg-border h-px flex-1" />
      {tag && <span className="text-muted-foreground text-[11px] tabular-nums">{tag}</span>}
      {action}
    </div>
  )
}

function ReportFigure({
  index,
  label,
  value,
  sub,
  barColor,
  progress,
}: {
  index: number
  label: string
  value: string
  sub?: string
  barColor?: string
  /** 0–100 — renders the animated hairline progress when set. */
  progress?: number
}) {
  const reduce = useReducedMotion()
  const width = `${Math.min(100, Math.max(0, progress ?? 0))}%`
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
      transition={
        reduce
          ? { duration: 0.15, ease: "easeOut" }
          : { duration: 0.4, ease: PAGE_EASE_OUT, delay: index * 0.07 }
      }
      className="flex min-w-0 flex-col gap-1.5 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
    >
      <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.16em]">
        {label}
      </span>
      <span className="text-4xl font-semibold tracking-tight tabular-nums xl:text-5xl">
        {value}
      </span>
      {progress != null && (
        <span className="bg-muted mt-1 block h-1 w-full max-w-36 overflow-hidden rounded-full">
          <motion.span
            initial={reduce ? undefined : { width: 0 }}
            animate={{ width }}
            transition={
              reduce
                ? undefined
                : { duration: 0.7, ease: PAGE_EASE_OUT, delay: 0.25 + index * 0.07 }
            }
            style={
              reduce
                ? { display: "block", height: "100%", width }
                : { display: "block", height: "100%" }
            }
            className={barColor ?? "bg-foreground"}
          />
        </span>
      )}
      {sub && <span className="text-muted-foreground text-xs tabular-nums">{sub}</span>}
    </motion.div>
  )
}

/** Hairline-ruled hero figure band; figures stagger left → right. */
export function ReportFigures({
  figures,
  className,
}: {
  figures: {
    label: string
    value: string
    sub?: string
    barColor?: string
    progress?: number
  }[]
  className?: string
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 ${className ?? ""}`}
    >
      {figures.map((f, i) => (
        <ReportFigure key={f.label} index={i} {...f} />
      ))}
    </div>
  )
}

/** Uppercase micro-kicker for card headers, matching the report language. */
export const REPORT_KICKER =
  "text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]"
