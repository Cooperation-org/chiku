export type BrandId = "default" | "workersvc"

interface BrandConfig {
  name: string
  favicon: string
  faviconType: string | undefined
}

const BRANDS: Record<BrandId, BrandConfig> = {
  default: {
    name: "TaigaLT",
    favicon: "/favicon.ico",
    faviconType: undefined,
  },
  workersvc: {
    name: "workers.vc",
    favicon: "/favicon.svg",
    faviconType: "image/svg+xml",
  },
}

function detectBrand(): BrandId {
  if (typeof window === "undefined") return "default"
  if (import.meta.env.VITE_BRAND === "workersvc") return "workersvc"
  return /(^|\.)workers\.vc$/.test(location.hostname) ? "workersvc" : "default"
}

export const brandId: BrandId = detectBrand()
export const brand: BrandConfig = BRANDS[brandId]

export function appTitle(projectName?: string): string {
  const base = brand.name
  if (typeof location === "undefined") return base
  if (brandId === "workersvc") {
    const host = location.hostname.replace(/\..*/, "")
    return projectName ? `${projectName} · ${host} · ${base}` : `${host} · ${base}`
  }
  return projectName ? `${projectName} · ${base}` : base
}
