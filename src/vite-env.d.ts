/// <reference types="vite/client" />

/** Baked by vite.config.ts `define` from package.json's version field. */
declare const __APP_VERSION__: string

declare module "*.mdx" {
  export const frontmatter: { version: string; date: string; title: string }
  const Component: import("react").ComponentType
  export default Component
}

interface ImportMetaEnv {
  /** Taiga API base, e.g. https://taiga.example.org/api/v1 (defaults to /api/v1) */
  readonly VITE_API_URL?: string
  // --- Deployment branding (see README "Branding your deployment") ---
  /** "1" forces the configured brand on regardless of hostname (dev) */
  readonly VITE_BRAND?: string
  /** App display name; default "Chiku" */
  readonly VITE_BRAND_NAME?: string
  /** Colored wordmark suffix; with VITE_BRAND_NAME set, empty = plain wordmark */
  readonly VITE_BRAND_NAME_ACCENT?: string
  /** App logo URL (BrandLogo); falls back to the favicon */
  readonly VITE_BRAND_LOGO?: string
  /** Favicon URL; MIME derived from the extension; default /favicon.ico */
  readonly VITE_BRAND_FAVICON?: string
  /** Social-preview image for og:image (raster preferred); falls back to the logo, then the favicon */
  readonly VITE_BRAND_OG_IMAGE?: string
  /** This deployment's public origin (e.g. https://chiku.yourorg.org) — enables og:url / twitter:url and absolute og:image */
  /** Light-mode accent, any CSS color (oklch/hex/…) */
  readonly VITE_BRAND_PRIMARY?: string
  /** Dark-mode accent; falls back to the light accent */
  readonly VITE_BRAND_PRIMARY_DARK?: string
  /** Text on the light accent; default near-white */
  readonly VITE_BRAND_PRIMARY_FG?: string
  /** Text on the dark accent; default near-black */
  readonly VITE_BRAND_PRIMARY_DARK_FG?: string
  /** Comma-separated hostname suffixes (e.g. "workers.vc") that activate the brand at runtime */
  readonly VITE_BRAND_HOSTS?: string
  // --- End branding ---
  /** Cohort cross-app nav bundle URL */
  readonly VITE_COHORT_NAV_SRC?: string
  /** Allowlisted origins for the /sso/relay ?next= hop, comma-separated */
  readonly VITE_SSO_RELAY_ORIGINS?: string
  /** Enables the direct "Continue with Google" button when set */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
