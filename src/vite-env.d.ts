/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Taiga API base, e.g. https://taiga.workers.vc/api/v1 (defaults to /api/v1) */
  readonly VITE_API_URL?: string
  /** Force a brand in dev ("workersvc"); production detects from hostname */
  readonly VITE_BRAND?: string
  /** Cohort cross-app nav bundle URL (workers.vc bar) */
  readonly VITE_COHORT_NAV_SRC?: string
  /** Allowlisted origins for the /sso/relay ?next= hop, comma-separated */
  readonly VITE_SSO_RELAY_ORIGINS?: string
  /** Enables the direct "Continue with Google" button when set */
  readonly PUBLIC_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
