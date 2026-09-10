import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from "@tanstack/react-table"

/**
 * The house column-meta contract: columns carry their own th/td Tailwind
 * classes instead of render-loop conditionals. Declared as a type-only
 * `columnMeta` slot on the feature stack (the v9 registry-slot mechanism),
 * so every table built on it gets typed meta without a global augmentation.
 */
export interface TableColumnMeta {
  /** Tailwind classes applied to both the header cell and the body cell. */
  className?: string
  /** Extra classes applied only to the header cell (after className). */
  headerClassName?: string
}

/**
 * House table feature stack (TanStack Table v9): sortable rows, includes-string
 * global filter, and client-side pagination. Tables using it pass controlled
 * `state` + `on*Change` and wire their own UI.
 */
export const appTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  globalFilteringFeature,
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: metaHelper<TableColumnMeta>(),
})

export const filterFn = filterFn_includesString

export const BACKLOG_PAGE_SIZE = 20
export const MEMBERS_PAGE_SIZE = 10
