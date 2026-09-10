import { brand, wordmarkParts } from "@/lib/brand"

export function BrandLogo({ className = "" }: { className?: string }) {
  return <img src={brand.logo} alt={brand.name} className={className} />
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
