// Module-file augmentation: importing first makes TS merge this with the
// package's real types. (A script-file `declare module` would shadow them.)
import "@tanstack/react-query"

declare module "@tanstack/react-query" {
  interface Register {
    /** Human-readable names for the sync-status query inspector. */
    queryMeta: {
      /** Scope text, e.g. "stories list"; prefixed with the project slug when projectId is set */
      label?: string
      /** Project id — the inspector resolves it to the project slug */
      projectId?: number
    }
  }
}
