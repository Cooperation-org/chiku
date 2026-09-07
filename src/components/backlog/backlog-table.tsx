import { useState } from "react"
import {
  createColumnHelper,
  FlexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatRelativeDate } from "@/lib/format"
import {
  appTableFeatures,
  BACKLOG_PAGE_SIZE,
  filterFn,
} from "@/lib/table"
import type { UserStory } from "@/lib/api/types"

/**
 * Backlog registry — TanStack Table v9 with the house feature stack:
 * sortable headers (mono uppercase, ↑/↓ arrows), a global filter, and
 * client-side pagination, all inside the report card language.
 */

const features = appTableFeatures
const helper = createColumnHelper<typeof features, UserStory>()

/** Stable fallback so the `data` array identity never flips per render. */
const EMPTY_STORIES: UserStory[] = []

const columns = helper.columns([
  helper.accessor("ref", {
    id: "ref",
    header: "Ref",
    cell: (info) => (
      <span className="text-muted-foreground font-mono text-xs">#{info.getValue()}</span>
    ),
    meta: { className: "w-16" },
  }),
  helper.accessor("subject", {
    id: "story",
    header: "Story",
    cell: (ctx) => {
      const story = ctx.row.original
      return (
        <div className="flex flex-col gap-1">
          <span className="transition-colors group-hover:text-primary">
            {story.subject}
          </span>
          <div className="flex items-center gap-2">
            {story.epics?.map((epic) => (
              <span
                key={epic.id}
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: `${epic.color}20`,
                  color: epic.color,
                }}
              >
                {epic.subject}
              </span>
            ))}
            {story.tags?.map(([tag, color]) => (
              <span
                key={tag}
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: `${color || "#666"}20`,
                  color: color || "#999",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )
    },
  }),
  helper.accessor((row) => row.status_extra_info?.name ?? "", {
    id: "status",
    header: "Status",
    cell: (ctx) => {
      const status = ctx.row.original.status_extra_info
      if (!status) return <span className="text-muted-foreground">—</span>
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
          style={{
            backgroundColor: `${status.color}20`,
            color: status.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.name}
        </span>
      )
    },
    meta: { className: "w-32" },
  }),
  helper.accessor((row) => row.assigned_to_extra_info?.full_name_display ?? "", {
    id: "assignee",
    header: "Assignee",
    cell: (ctx) => {
      const person = ctx.row.original.assigned_to_extra_info
      if (!person) {
        return <span className="text-muted-foreground/60 text-sm">Unassigned</span>
      }
      return (
        <div className="flex items-center gap-2">
          <Avatar
            name={person.full_name_display}
            photo={person.photo}
            size="sm"
            className="text-white"
          />
          <span className="text-muted-foreground text-sm">
            {person.full_name_display.split(" ")[0]}
          </span>
        </div>
      )
    },
    meta: { className: "w-32" },
  }),
  helper.accessor((row) => row.total_points ?? 0, {
    id: "points",
    header: "Points",
    cell: (ctx) =>
      ctx.row.original.total_points ? (
        <span className="font-medium tabular-nums">
          {ctx.row.original.total_points}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    meta: { className: "w-16 text-right", headerClassName: "text-right" },
  }),
  helper.accessor("modified_date", {
    id: "updated",
    header: "Updated",
    cell: (info) => (
      <span className="text-muted-foreground font-mono text-xs">
        {formatRelativeDate(info.getValue())}
      </span>
    ),
    meta: { className: "w-20 text-right", headerClassName: "text-right" },
  }),
])

export function BacklogTable({
  stories,
  onOpen,
}: {
  stories: UserStory[]
  onOpen: (story: UserStory) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: BACKLOG_PAGE_SIZE,
  })

  const table = useTable({
    features,
    columns,
    data: stories ?? EMPTY_STORIES,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: filterFn,
    getRowId: (row) => String(row.id),
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <section className="overflow-hidden rounded-lg border bg-card transition-colors hover:border-ring/40">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
          Registry
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {filteredCount}
        </span>
        <div className="relative ml-auto w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            placeholder="Filter stories…"
            className="h-7 pl-8 font-mono text-xs"
            aria-label="Filter stories"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sortable = header.column.getCanSort()
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-2.5 ${meta?.className ?? ""} ${meta?.headerClassName ?? ""}`}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="text-muted-foreground flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider hover:text-foreground"
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
                        <span className="text-muted-foreground font-mono text-[11px] font-semibold uppercase tracking-wider">
                          <FlexRender header={header} />
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group cursor-pointer transition-colors hover:bg-accent/40"
                onClick={() => onOpen(row.original)}
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 ${cell.column.columnDef.meta?.className ?? ""}`}
                  >
                    <FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground px-4 py-8 text-center text-sm">
          No stories match the filter.
        </p>
      )}

      {/* Pagination */}
      <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 font-mono text-xs tabular-nums">
        <span>
          Page {table.state.pagination.pageIndex + 1} of{" "}
          {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
