/**
 * Deployment branding, configured entirely through Vite env vars.
 *
 * Any org can clone chiku, drop their assets in `static/brand/` (gitignored),
 * set VITE_BRAND_* in .env, and get their own look — no code changes and no
 * server (see README "Branding your deployment"). A bare clone with no brand
 * env shows the shipped default: the "Chiku" name, the Taiga favicon,
 * and the neutral theme.
 *
 * Activation: the brand applies when VITE_BRAND=1 (dev force), or — for one
 * shared bundle serving several hosts — when the hostname matches a suffix
 * in VITE_BRAND_HOSTS, or when brand vars are set with no list at all (a
 * single-domain deployment). Inactive means the pure default everywhere.
 *
 * index.html runs a mirror of this logic pre-paint (placeholders let Vite
 * bake the same env there), so favicon, title and accent colors are right
 * before first paint. applyBrand() is the React-side safety net and is
 * idempotent, so running both is harmless.
 */

const DEFAULT_NAME = "Chiku"
/** Shipped fallback asset: the Taiga favicon every logo ultimately degrades to. */
export const DEFAULT_FAVICON = "/favicon.ico"

/** Value of the data-brand attribute, matching the selectors in index.css. */
export const BRAND_DATA = "custom" as const

export type BrandId = "default" | typeof BRAND_DATA

export interface BrandConfig {
  /** False = the shipped default look, unaffected by any brand var. */
  active: boolean
  /**
   * The brand was reached via VITE_BRAND_HOSTS hostname matching (one shared
   * bundle serving several hosts) rather than owned outright by this build.
   */
  hostMatched: boolean
  /** App display name: document title, login and empty-state wordmarks. */
  name: string
  /** Optional colored wordmark suffix; "" = none. */
  accent: string
  /** App logo image used by BrandLogo. */
  logo: string
  /** Favicon URL. */
  favicon: string
  /** Favicon MIME type, derived from the extension (".ico" needs none). */
  faviconType: string | undefined
  /**
   * Social-preview image for og:image (raster preferred; SVG renders badly on
   * crawlers). Falls back to the logo, then the favicon.
   */
  ogImage: string | undefined
  /** Accent colors (any CSS color); undefined lets the neutral theme stand. */
  primary: string | undefined
  primaryDark: string | undefined
  /** Text on top of the accent. */
  primaryForeground: string
  primaryDarkForeground: string
}

/**
 * Env vars that Vite exposed to the inline pre-paint script but left out of
 * the bundle still arrive as unfilled "%VITE_…%" placeholders — treat those
 * (and empty strings) as unset, everywhere.
 */
function envValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed || /^%.*%$/.test(trimmed)) return undefined
  return trimmed
}

function hostMatchesSuffix(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`)
}

function splitHostList(raw: string | undefined): string[] {
  const value = envValue(raw)
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []
}

export interface BrandEnv {
  readonly VITE_BRAND?: string
  readonly VITE_BRAND_NAME?: string
  readonly VITE_BRAND_NAME_ACCENT?: string
  readonly VITE_BRAND_LOGO?: string
  readonly VITE_BRAND_FAVICON?: string
  readonly VITE_BRAND_OG_IMAGE?: string
  readonly VITE_BRAND_URL?: string
  readonly VITE_BRAND_PRIMARY?: string
  readonly VITE_BRAND_PRIMARY_DARK?: string
  readonly VITE_BRAND_PRIMARY_FG?: string
  readonly VITE_BRAND_PRIMARY_DARK_FG?: string
  readonly VITE_BRAND_HOSTS?: string
}

/** The near-white/near-black text colors the neutral theme pairs with accents. */
const DEFAULT_PRIMARY_FG = "oklch(0.985 0 0)"
const DEFAULT_PRIMARY_DARK_FG = "oklch(0.145 0 0)"

export function faviconTypeFor(href: string): string | undefined {
  const file = href.split(/[?#]/)[0]
  const ext = file.slice(file.lastIndexOf(".") + 1).toLowerCase()
  if (ext === "svg") return "image/svg+xml"
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  if (ext === "gif") return "image/gif"
  return undefined
}

/** Pure resolution of the env contract — unit-tested in __tests__/brand.test.ts. */
export function resolveBrand(
  env: BrandEnv,
  hostname: string | null,
): BrandConfig {
  const name = envValue(env.VITE_BRAND_NAME)
  const accent = envValue(env.VITE_BRAND_NAME_ACCENT)
  const favicon = envValue(env.VITE_BRAND_FAVICON)
  const logo = envValue(env.VITE_BRAND_LOGO)
  const ogImage = envValue(env.VITE_BRAND_OG_IMAGE)
  const primary = envValue(env.VITE_BRAND_PRIMARY)
  const force = envValue(env.VITE_BRAND) === "1"
  const suffixes = splitHostList(env.VITE_BRAND_HOSTS)
  const hostMatched =
    typeof hostname === "string" && suffixes.some((s) => hostMatchesSuffix(hostname, s))
  const hasConfig = Boolean(name || accent || favicon || logo || ogImage || primary)
  // With no hostname suffixes, configured brand vars are the deployment's
  // own choice and apply wherever the bundle is served.
  const active = force || hostMatched || (hasConfig && suffixes.length === 0)

  return {
    active,
    hostMatched: active && !force && hostMatched,
    name: name ?? DEFAULT_NAME,
    accent: accent ?? "",
    logo: logo ?? favicon ?? DEFAULT_FAVICON,
    favicon: favicon ?? DEFAULT_FAVICON,
    faviconType: faviconTypeFor(favicon ?? DEFAULT_FAVICON),
    ogImage: ogImage ?? logo ?? favicon,
    primary,
    primaryDark: envValue(env.VITE_BRAND_PRIMARY_DARK),
    primaryForeground: envValue(env.VITE_BRAND_PRIMARY_FG) ?? DEFAULT_PRIMARY_FG,
    primaryDarkForeground:
      envValue(env.VITE_BRAND_PRIMARY_DARK_FG) ?? DEFAULT_PRIMARY_DARK_FG,
  }
}

function currentHostname(): string | null {
  if (typeof window === "undefined") return null
  return window.location?.hostname ?? null
}

export const brandId: BrandId = resolveBrand(import.meta.env, currentHostname()).active
  ? BRAND_DATA
  : "default"

export const brand: BrandConfig = resolveBrand(import.meta.env, currentHostname())

/**
 * The wordmark split for branding surfaces: an optional colored accent
 * suffix. The accent only shows when it really is the name's tail —
 * anything else got misconfigured and the full name renders plain.
 */
export function wordmarkParts(): { base: string; accent: string } {
  if (brand.accent && brand.name.endsWith(brand.accent)) {
    return { base: brand.name.slice(0, -brand.accent.length), accent: brand.accent }
  }
  return { base: brand.name, accent: "" }
}

/**
 * Set data-brand plus the accent custom properties the [data-brand="custom"]
 * rules in index.css read. Inline styles so no value needs to exist in
 * shipped CSS; the pre-paint script in index.html already did this.
 */
export function applyBrand(): void {
  if (typeof document === "undefined" || !brand.active) return
  const root = document.documentElement
  root.dataset.brand = BRAND_DATA
  const style = root.style
  if (brand.primary) style.setProperty("--brand-primary", brand.primary)
  if (brand.primaryDark) style.setProperty("--brand-primary-dark", brand.primaryDark)
  style.setProperty("--brand-primary-fg", brand.primaryForeground)
  style.setProperty("--brand-primary-fg-dark", brand.primaryDarkForeground)
}
