import { FlexRender, type Header, type RowData } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { appTableFeatures } from "@/lib/table"
import { cn } from "cn"

/**
 * Shared chrome for the registry tables: the sortable mono header cell and
 * the pagination footer. One implementation guarantees that both tables'
 * header/body alignment, sorting affordance and footer read identically.
 * Alignment rule: a column's meta.className carries BOTH width and text
 * alignment, and it is applied verbatim to the th and the matching td.
 */

/** Th cell — hairline-ruled; sortable columns get a mono button with ↑/↓. */
export function RegistryTh<TData extends RowData>({
  header,
}: {
  header: Header<typeof appTableFeatures, TData>
}) {
  const meta = header.column.columnDef.meta
  const classes = cn("px-4 py-2.5", meta?.className, meta?.headerClassName)
  return (
    <th className={classes} scope="col">
      {header.isPlaceholder ? null : header.column.getCanSort() ? (
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors"
        >
          <FlexRender header={header} />
          <span aria-hidden>
            {
              {
                asc: "↑",
                desc: "↓",
              }[header.column.getIsSorted() as string] ?? ""
            }
          </span>
        </button>
      ) : (
        <span className="text-muted-foreground inline-flex items-center font-mono text-[11px] font-semibold tracking-wider uppercase">
          <FlexRender header={header} />
        </span>
      )}
    </th>
  )
}

/** Mono pagination footer: "[count ·] page x of y" + chevron steppers. */
export function RegistryPagination({
  page,
  pageCount,
  count,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  page: number
  pageCount: number
  count?: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="text-muted-foreground flex items-center justify-between px-6 py-2.5 font-mono text-xs tabular-nums">
      <span>
        {count != null && `${count} · `}
        page {page} of {Math.max(1, pageCount)}
      </span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={!canNext}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
