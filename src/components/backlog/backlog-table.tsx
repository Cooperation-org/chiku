import { Avatar } from "@/components/app/avatar"
import {
  RegistryPagination,
  RegistryTh,
} from "@/components/table/registry-chrome"
import type { UserStory } from "@/lib/api/types"
import { formatRelativeDate } from "@/lib/format"
import { appTableFeatures, BACKLOG_PAGE_SIZE, filterFn } from "@/lib/table"
import {
  createColumnHelper,
  FlexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { useState } from "react"

/**
 * Backlog registry — a borderless editorial table. TanStack Table v9 drives
 * the models (sorting, global filter from the URL, pagination); the markup is
 * a plain flush table with hairline rules. Alignment rule: every column's
 * meta.className is applied verbatim to its th and td.
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
      <span className="font-mono text-xs text-muted-foreground">
        #{info.getValue()}
      </span>
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
  helper.accessor(
    (row) => row.assigned_to_extra_info?.full_name_display ?? "",
    {
      id: "assignee",
      header: "Assignee",
      cell: (ctx) => {
        const person = ctx.row.original.assigned_to_extra_info
        if (!person) {
          return (
            <span className="text-sm text-muted-foreground/60">Unassigned</span>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar
              name={person.full_name_display}
              photo={person.photo}
              size="sm"
              className="text-white"
            />
            <span className="text-sm text-muted-foreground">
              {person.full_name_display.split(" ")[0]}
            </span>
          </div>
        )
      },
      meta: { className: "w-32" },
    }
  ),
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
    meta: { className: "w-16 text-right" },
  }),
  helper.accessor("modified_date", {
    id: "updated",
    header: "Updated",
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {formatRelativeDate(info.getValue())}
      </span>
    ),
    meta: { className: "w-20 text-right" },
  }),
])

export function BacklogTable({
  stories,
  filter,
  onOpen,
}: {
  stories: UserStory[]
  filter: string
  onOpen: (story: UserStory) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: BACKLOG_PAGE_SIZE,
  })

  // A changed filter (from the URL) always reads from page 1 — render-phase
  // state adjustment, no effects.
  const [prevFilter, setPrevFilter] = useState(filter)
  if (prevFilter !== filter) {
    setPrevFilter(filter)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const table = useTable({
    features,
    columns,
    data: stories ?? EMPTY_STORIES,
    state: { sorting, globalFilter: filter, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: filterFn,
    getRowId: (row) => String(row.id),
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div>
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b">
              {group.headers.map((header) => (
                <RegistryTh key={header.id} header={header} />
              ))}
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

      {rows.length === 0 && (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No stories match the filter.
        </p>
      )}

      <div className="border-t">
        <RegistryPagination
          page={table.state.pagination.pageIndex + 1}
          pageCount={table.getPageCount()}
          count={filteredCount}
          canPrev={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
          onPrev={() => table.previousPage()}
          onNext={() => table.nextPage()}
        />
      </div>
    </div>
  )
}
