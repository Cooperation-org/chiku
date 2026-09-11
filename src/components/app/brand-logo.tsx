import { useState } from "react"
import { brand, DEFAULT_FAVICON, wordmarkParts } from "@/lib/brand"

export function BrandLogo({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState(brand.logo)
  return (
    <img
      src={src}
      // A misconfigured logo path (missing static/brand file, dead CDN URL)
      // degrades to the shipped favicon instead of a broken image. The guard
      // keeps a failing fallback from retry-looping.
      onError={() => {
        if (src !== DEFAULT_FAVICON) setSrc(DEFAULT_FAVICON)
      }}
      alt={brand.name}
      className={className}
    />
  )
}

/**
 * The app name as a wordmark: an optional colored accent suffix (the "LT"
 * in "YourOrgLT"), split where the configured accent really ends the name.
 */
export function BrandWordmark({ className = "" }: { className?: string }) {
  const { base, accent } = wordmarkParts()
  return (
    <span className={className}>
      {base}
      {accent && <span className="text-primary">{accent}</span>}
    </span>
  )
}
