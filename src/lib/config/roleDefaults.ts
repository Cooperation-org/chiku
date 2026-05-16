/**
 * Configurable role defaults for volunteer-friendly vs tech-oriented setups.
 *
 * Set via environment variables (in .env):
 *   VITE_DEFAULT_ROLE_NAMES=Volunteer,Member,Contributor
 *
 * How it works:
 * - When adding/inviting members, Marten selects a default role
 * - If VITE_DEFAULT_ROLE_NAMES is set, it picks the first role from that list
 *   that exists in the project's roles
 * - If not set, or none match, falls back to the first role by order (default Taiga behavior)
 *
 * Volunteer instance example:
 *   VITE_DEFAULT_ROLE_NAMES=Volunteer,Member,Contributor
 *
 * Tech instance (or empty/unset):
 *   Uses Taiga's default order behavior
 */

export interface RoleDefaultsConfig {
  preferredRoleNames: string[];
}

function parseRoleNames(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function getRoleDefaultsConfig(): RoleDefaultsConfig {
  const preferredRoleNames = parseRoleNames(
    import.meta.env.VITE_DEFAULT_ROLE_NAMES as string | undefined
  );

  return { preferredRoleNames };
}

export function getDefaultRoleId(roles: { id: number; name: string; slug: string; order: number }[]): number | null {
  const config = getRoleDefaultsConfig();

  if (config.preferredRoleNames.length === 0) {
    // No preference set — use first role by order (default Taiga behavior)
    return roles.length > 0 ? roles[0].id : null;
  }

  // Try to find first preferred role that exists in this project's roles
  for (const preferredName of config.preferredRoleNames) {
    const match = roles.find(r =>
      r.name.toLowerCase() === preferredName.toLowerCase()
    );
    if (match) return match.id;
  }

  // None of the preferred roles exist — fall back to first by order
  return roles.length > 0 ? roles[0].id : null;
}