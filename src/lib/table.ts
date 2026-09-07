import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from "@tanstack/react-table"

/**
 * House table feature stack (TanStack Table v9): sortable rows, includes-string
 * global filter, and client-side pagination — the mpp-tempo admin-table setup.
 * Tables using it pass controlled `state` + `on*Change` and wire their own UI.
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
})

export const filterFn = filterFn_includesString

export const BACKLOG_PAGE_SIZE = 20
export const MEMBERS_PAGE_SIZE = 10
