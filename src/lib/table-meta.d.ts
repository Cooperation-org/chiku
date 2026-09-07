// Global column-meta contract for TanStack Table v9 (declaration-merged).
// A single augmentation keeps the house table styling declarative: columns
// carry their own th/td Tailwind classes instead of render-loop conditionals.
/* eslint-disable @typescript-eslint/no-unused-vars -- the type params exist for
   declaration merging; their constraints mirror the core interface */
import type { CellData, RowData, TableFeatures } from "@tanstack/table-core"

declare module "@tanstack/table-core" {
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /** Tailwind classes applied to both the header cell and the body cell. */
    className?: string
    /** Extra classes applied only to the header cell (after className). */
    headerClassName?: string
  }
}
