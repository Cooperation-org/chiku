import { useMemo, useState } from "react"
import {
  createColumnHelper,
  FlexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { BrailleLoader } from "@/components/ui/braille-loader"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMemberships, useRemoveMembership } from "@/lib/queries/memberships"
import { appTableFeatures, filterFn, MEMBERS_PAGE_SIZE } from "@/lib/table"
import type { Membership, Project } from "@/lib/api/memberships"

/**
 * Members registry — TanStack Table v9 with the house feature stack:
 * sortable mono headers, a global filter over name/role, and client-side
 * pagination inside the report card language.
 */

const features = appTableFeatures
const helper = createColumnHelper<typeof features, Membership>()

/** Stable fallback so the `data` array identity never flips per render. */
const EMPTY_MEMBERS: Membership[] = []

export function MembersTable({
  project,
  canManage,
}: {
  project: Project
  canManage: boolean
}) {
  const { data: memberships = EMPTY_MEMBERS, isLoading } = useMemberships(
    project.id
  )
  const removeMembership = useRemoveMembership(project.id)

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: MEMBERS_PAGE_SIZE,
  })

  const columns = useMemo(() => {
    return helper.columns([
      helper.accessor("full_name", {
        id: "name",
        header: "Name",
        cell: (ctx) => {
          const m = ctx.row.original
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                name={m.full_name}
                photo={m.photo}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0">
                <span className="block truncate text-sm">
                  {m.full_name || `user ${m.user}`}
                </span>
                {m.email && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.email}
                  </span>
                )}
              </div>
            </div>
          )
        },
      }),
      helper.accessor("role_name", {
        id: "role",
        header: "Role",
        cell: (ctx) => {
          const m = ctx.row.original
          return (
            <div className="flex flex-wrap items-center gap-1">
              <span className="rounded bg-accent px-2 py-0.5 text-xs">
                {m.role_name}
              </span>
              {m.is_owner && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-primary">
                  owner
                </span>
              )}
              {m.is_admin && !m.is_owner && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-primary">
                  admin
                </span>
              )}
            </div>
          )
        },
        meta: { className: "w-40" },
      }),
      helper.accessor((row) => (row.is_active ? "active" : "pending"), {
        id: "access",
        header: "Access",
        cell: (ctx) => {
          const m = ctx.row.original
          return (
            <span
              className={`font-mono text-xs font-medium ${
                m.is_active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {m.is_active ? "active" : "pending"}
            </span>
          )
        },
        meta: {
          className: "w-24 text-right",
          headerClassName: "text-right",
        },
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: (ctx) => {
          const m = ctx.row.original
          if (!canManage || m.is_owner) return null
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 px-2"
              onClick={async () => {
                try {
                  await removeMembership.mutateAsync(m.id)
                  toast(`Removed ${m.full_name}`)
                } catch (err) {
                  toast.error(`Failed to remove: ${(err as Error).message}`)
                }
              }}
              disabled={removeMembership.isPending}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          )
        },
        meta: {
          className: "w-24 text-right",
          headerClassName: "text-right",
        },
      }),
    ])
  }, [canManage, removeMembership])

  const table = useTable({
    features,
    columns,
    data: memberships,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: filterFn,
    getRowId: (row) => String(row.id),
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const colSpan = canManage ? 4 : 3

  return (
    <section className="overflow-hidden rounded-lg border bg-card transition-colors hover:border-ring/40">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
          Roster
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {filteredCount}
        </span>
        <div className="relative ml-auto w-56">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            placeholder="Filter members…"
            className="h-7 pl-8 font-mono text-xs"
            aria-label="Filter members"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta
                const sortable = header.column.getCanSort()
                return (
                  <TableHead
                    key={header.id}
                    className={`${meta?.className ?? ""} ${meta?.headerClassName ?? ""}`}
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
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-8 text-center">
                {/* Inline loader — a full-height PageLoading would break the table shape. */}
                <BrailleLoader
                  variant="chase"
                  speed="fast"
                  label="Loading members"
                  fontSize={16}
                  className="justify-center text-muted-foreground"
                />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="py-8 text-center text-muted-foreground"
              >
                No members match the filter.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.className ?? ""}
                  >
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
