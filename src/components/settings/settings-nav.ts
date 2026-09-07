import { Crown, Settings2, type LucideIcon } from "lucide-react"

export type SettingsRouteId =
  | "/projects/$slug/settings/general"
  | "/projects/$slug/settings/notifications"
  | "/projects/$slug/settings/integrations"
  | "/projects/$slug/settings/webhooks"
  | "/projects/$slug/settings/data"
  | "/projects/$slug/settings/ownership"
  | "/projects/$slug/settings/danger"

export interface SettingsSectionMeta {
  key: string
  label: string
  description: string
  icon: LucideIcon
  /** File-route id for typed navigation. */
  route: SettingsRouteId
  /** Hide the nav item (and deny the leaf) unless this passes. */
  requiresDelete?: boolean
}

/** GitLab-style settings submenu — sidebar group and in-page nav share this. */
export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    key: "general",
    label: "General",
    description: "Name, brand, modules & visibility",
    icon: Settings2,
    route: "/projects/$slug/settings/general",
  },
  // {
  //   key: "notifications",
  //   label: "Notifications",
  //   description: "Project email level",
  //   icon: Bell,
  //   route: "/projects/$slug/settings/notifications",
  // },
  // {
  //   key: "integrations",
  //   label: "Integrations",
  //   description: "VCS webhook endpoints & secrets",
  //   icon: Plug,
  //   route: "/projects/$slug/settings/integrations",
  // },
  // {
  //   key: "webhooks",
  //   label: "Webhooks",
  //   description: "Outgoing event deliveries",
  //   icon: Webhook,
  //   route: "/projects/$slug/settings/webhooks",
  // },
  // {
  //   key: "data",
  //   label: "Data",
  //   description: "Backup, duplicate & templates",
  //   icon: Database,
  //   route: "/projects/$slug/settings/data",
  // },
  {
    key: "ownership",
    label: "Ownership",
    description: "Leave or transfer the project",
    icon: Crown,
    route: "/projects/$slug/settings/ownership",
  },
  // {
  //   key: "danger",
  //   label: "Danger zone",
  //   description: "Archive & delete",
  //   icon: OctagonAlert,
  //   route: "/projects/$slug/settings/danger",
  //   requiresDelete: true,
  // },
]
