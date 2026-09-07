import { Avatar } from "@/components/app/avatar"
import {
  RegistryPagination,
  RegistryTh,
} from "@/components/table/registry-chrome"
import { BrailleLoader } from "@/components/ui/braille-loader"
import { Button } from "@/components/ui/button"
import type { Membership, Project } from "@/lib/api/memberships"
import { useMemberships, useRemoveMembership } from "@/lib/queries/memberships"
import { appTableFeatures, filterFn, MEMBERS_PAGE_SIZE } from "@/lib/table"
import {
  createColumnHelper,
  FlexRender,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

/**
 * Members registry — a borderless editorial table over the memberships
 * query. TanStack Table v9 drives sorting, the URL-sourced global filter and
 * pagination; markup is a plain flush table with hairline rules, aligned via
 * each column's meta.className applied verbatim to its th and td.
 */

const features = appTableFeatures
const helper = createColumnHelper<typeof features, Membership>()

/** Stable fallback so the `data` array identity never flips per render. */
const EMPTY_MEMBERS: Membership[] = []

export function MembersTable({
  project,
  filter,
  canManage,
}: {
  project: Project
  filter: string
  canManage: boolean
}) {
  const { data: memberships = EMPTY_MEMBERS, isLoading } = useMemberships(
    project.id
  )
  const removeMembership = useRemoveMembership(project.id)

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: MEMBERS_PAGE_SIZE,
  })

  // A changed filter (from the URL) always reads from page 1 — render-phase
  // state adjustment, no effects.
  const [prevFilter, setPrevFilter] = useState(filter)
  if (prevFilter !== filter) {
    setPrevFilter(filter)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

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
        meta: { className: "w-24 text-right" },
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
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
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
        meta: { className: "w-24 text-right" },
      }),
    ])
  }, [canManage, removeMembership])

  const table = useTable({
    features,
    columns,
    data: memberships,
    state: { sorting, globalFilter: filter, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: filterFn,
    getRowId: (row) => String(row.id),
  })

  const rows = table.getRowModel().rows
  const colSpan = canManage ? 4 : 3

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
          {isLoading ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center">
                {/* Inline loader — a full-height PageLoading would break the table shape. */}
                <BrailleLoader
                  variant="chase"
                  speed="fast"
                  label="Loading members"
                  fontSize={16}
                  className="justify-center text-muted-foreground"
                />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No members match the filter.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 ${cell.column.columnDef.meta?.className ?? ""}`}
                  >
                    <FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="border-t">
        <RegistryPagination
          page={table.state.pagination.pageIndex + 1}
          pageCount={table.getPageCount()}
          canPrev={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
          onPrev={() => table.previousPage()}
          onNext={() => table.nextPage()}
        />
      </div>
    </div>
  )
}
