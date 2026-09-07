import { brand } from "@/lib/brand"

export function BrandLogo({ className = "" }: { className?: string }) {
  return <img src={brand.favicon} alt={brand.name} className={className} />
}
