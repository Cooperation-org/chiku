import type { ReactNode } from "react"

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

/** Card wrapper every settings section is built on. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="bg-card rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}
