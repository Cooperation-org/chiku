// Deployment branding env contract (README "Branding your deployment").
// The module resolves brand config at import time, so every case re-imports
// fresh with vi.resetModules() after stubbing the env it wants.
import { beforeEach, describe, expect, it, vi } from "vitest"

type Brand = typeof import("@/lib/brand")

async function loadBrand(): Promise<Brand> {
  vi.resetModules()
  return import("@/lib/brand")
}

/** The local .env carries the workers.vc config — clear every brand var. */
function stubCleanEnv() {
  for (const key of [
    "VITE_BRAND",
    "VITE_BRAND_NAME",
    "VITE_BRAND_NAME_ACCENT",
    "VITE_BRAND_LOGO",
    "VITE_BRAND_FAVICON",
    "VITE_BRAND_OG_IMAGE",
    "VITE_BRAND_PRIMARY",
    "VITE_BRAND_PRIMARY_DARK",
    "VITE_BRAND_PRIMARY_FG",
    "VITE_BRAND_PRIMARY_DARK_FG",
    "VITE_BRAND_HOSTS",
  ]) {
    vi.stubEnv(key, "")
  }
}

beforeEach(() => {
  stubCleanEnv()
  vi.unstubAllGlobals()
})

describe("resolveBrand via module import", () => {
  it("a bare clone shows the shipped default, inactive", async () => {
    const { brand, brandId, wordmarkParts } = await loadBrand()
    expect(brand.active).toBe(false)
    expect(brand.hostMatched).toBe(false)
    expect(brandId).toBe("default")
    expect(brand.name).toBe("Chiku")
    expect(brand.accent).toBe("")
    expect(brand.favicon).toBe("/favicon.ico")
    expect(brand.faviconType).toBeUndefined()
    expect(brand.logo).toBe("/favicon.ico")
    expect(brand.primary).toBeUndefined()
    expect(wordmarkParts()).toEqual({ base: "Chiku", accent: "" })
  })

  it("empty values and %VITE…% placeholders count as unset", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "")
    vi.stubEnv("VITE_BRAND_FAVICON", "%VITE_BRAND_FAVICON%")
    const { brand } = await loadBrand()
    expect(brand.name).toBe("Chiku")
    expect(brand.favicon).toBe("/favicon.ico")
    expect(brand.active).toBe(false)
  })

  it("VITE_BRAND=1 forces the brand on", async () => {
    vi.stubEnv("VITE_BRAND", "1")
    const { brand } = await loadBrand()
    expect(brand.active).toBe(true)
    expect(brand.hostMatched).toBe(false)
  })

  it("a hostname suffix in VITE_BRAND_HOSTS activates with a host-matched flag", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "workers.vc")
    vi.stubEnv("VITE_BRAND_HOSTS", "workers.vc")
    vi.stubGlobal("window", { location: { hostname: "marten.workers.vc" } })
    const { brand } = await loadBrand()
    expect(brand.active).toBe(true)
    expect(brand.hostMatched).toBe(true)
  })

  it("the same bundle keeps the default on a foreign host", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "workers.vc")
    vi.stubEnv("VITE_BRAND_HOSTS", "workers.vc")
    vi.stubGlobal("window", { location: { hostname: "linkedtrust.us" } })
    const { brand, brandId } = await loadBrand()
    expect(brand.active).toBe(false)
    expect(brandId).toBe("default")
  })

  it("suffix matching respects the dot boundary", async () => {
    vi.stubEnv("VITE_BRAND_HOSTS", "workers.vc")
    vi.stubGlobal("window", { location: { hostname: "notworkers.vc" } })
    const { brand } = await loadBrand()
    expect(brand.active).toBe(false)
  })

  it("brand config without any host list applies everywhere (single domain)", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "Acme")
    vi.stubGlobal("window", { location: { hostname: "chiku.acme.org" } })
    const { brand, wordmarkParts } = await loadBrand()
    expect(brand.active).toBe(true)
    expect(brand.hostMatched).toBe(false)
    expect(brand.name).toBe("Acme")
    // A named brand without an accent gets a plain wordmark.
    expect(brand.accent).toBe("")
    expect(wordmarkParts()).toEqual({ base: "Acme", accent: "" })
  })

  it("a custom name with a tail accent splits the wordmark", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "CooperLT")
    vi.stubEnv("VITE_BRAND_NAME_ACCENT", "LT")
    const { wordmarkParts } = await loadBrand()
    expect(wordmarkParts()).toEqual({ base: "Cooper", accent: "LT" })
  })

  it("an accent that is not the name's tail renders the plain name", async () => {
    vi.stubEnv("VITE_BRAND_NAME", "Acme")
    vi.stubEnv("VITE_BRAND_NAME_ACCENT", "LT")
    const { wordmarkParts } = await loadBrand()
    expect(wordmarkParts()).toEqual({ base: "Acme", accent: "" })
  })

  it("the app logo falls back to the configured favicon", async () => {
    vi.stubEnv("VITE_BRAND_FAVICON", "/brand/favicon.svg")
    const { brand } = await loadBrand()
    expect(brand.logo).toBe("/brand/favicon.svg")
    expect(brand.faviconType).toBe("image/svg+xml")
  })

  it("an explicit logo wins over the favicon fallback", async () => {
    vi.stubEnv("VITE_BRAND_LOGO", "/brand/logo.svg")
    const { brand } = await loadBrand()
    expect(brand.logo).toBe("/brand/logo.svg")
  })

  it(".ico favicons need no MIME type", async () => {
    vi.stubEnv("VITE_BRAND_FAVICON", "/brand/favicon.ico")
    const { brand } = await loadBrand()
    expect(brand.faviconType).toBeUndefined()
  })

  it("the social preview falls back to the logo, then the favicon", async () => {
    vi.stubEnv("VITE_BRAND_FAVICON", "/brand/favicon.svg")
    const withFavicon = (await loadBrand()).brand
    expect(withFavicon.ogImage).toBe("/brand/favicon.svg")
    vi.stubEnv("VITE_BRAND_LOGO", "/brand/logo.svg")
    const withLogo = (await loadBrand()).brand
    expect(withLogo.ogImage).toBe("/brand/logo.svg")
    vi.stubEnv("VITE_BRAND_OG_IMAGE", "/brand/og.png")
    const withOg = (await loadBrand()).brand
    expect(withOg.ogImage).toBe("/brand/og.png")
  })

  it("accent colors come with sensible contrast defaults", async () => {
    vi.stubEnv("VITE_BRAND_PRIMARY", "oklch(0.55 0.17 145)")
    const { brand } = await loadBrand()
    expect(brand.primary).toBe("oklch(0.55 0.17 145)")
    expect(brand.primaryDark).toBeUndefined()
    expect(brand.primaryForeground).toBe("oklch(0.985 0 0)")
    expect(brand.primaryDarkForeground).toBe("oklch(0.145 0 0)")
  })
})

describe("applyBrand", () => {
  it("sets the data attribute and the accent custom properties", async () => {
    vi.stubEnv("VITE_BRAND", "1")
    vi.stubEnv("VITE_BRAND_PRIMARY", "green")
    const setProperty = vi.fn()
    const dataset: Record<string, string | undefined> = {}
    vi.stubGlobal("document", {
      documentElement: { dataset, style: { setProperty } },
    })
    const { applyBrand } = await loadBrand()
    applyBrand()
    expect(dataset.brand).toBe("custom")
    expect(setProperty).toHaveBeenCalledWith("--brand-primary", "green")
    expect(setProperty).not.toHaveBeenCalledWith(
      "--brand-primary-dark",
      expect.anything(),
    )
    // Contrast defaults always land, so the [data-brand="custom"] rules in
    // index.css never read a missing property.
    expect(setProperty).toHaveBeenCalledWith("--brand-primary-fg", "oklch(0.985 0 0)")
    expect(setProperty).toHaveBeenCalledWith("--brand-primary-fg-dark", "oklch(0.145 0 0)")
  })

  it("is a no-op while the default brand is showing", async () => {
    const { applyBrand } = await loadBrand()
    expect(() => applyBrand()).not.toThrow()
  })
})
