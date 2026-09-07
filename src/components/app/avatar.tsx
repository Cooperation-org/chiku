import { initialsFor } from "@/lib/utils/initials"
import { marbleGradient } from "@/lib/utils/marble"

const boxes = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
} as const

interface AvatarProps {
  /** The name the initials come from — full_name_display, or the username. */
  name?: string | null
  /** Taiga's uploaded picture, when the person has one. */
  photo?: string | null
  /**
   * Explicit solid background (Taiga's monotone choice, or a project
   * identicon colour). When absent, a deterministic marble gradient derived
   * from the full name is used — two people with the same initials still get
   * different backgrounds.
   */
  color?: string | null
  /**
   * "auto" (default): photo > mono colour > marble.
   * "marble": always the name-derived marble, ignoring photo and colour.
   */
  variant?: "auto" | "marble"
  size?: keyof typeof boxes
  className?: string
}

export function Avatar({ name, photo, color, variant = "auto", size = "md", className = "" }: AvatarProps) {
  const label = name ?? ""

  const showPhoto = variant === "auto" && !!photo
  const solid = variant === "auto" && !!color

  if (showPhoto) {
    return (
      <img
        src={photo}
        alt={label}
        title={label}
        className={`rounded-full object-cover ${boxes[size]} ${className}`}
      />
    )
  }

  // Marble: a name-derived gradient, with white initials kept readable over
  // the blobs. Used by default, or forced with variant="marble".
  const style = solid
    ? { backgroundColor: color as string }
    : { background: marbleGradient(label), color: "white", textShadow: "0 1px 2px rgb(0 0 0 / 0.35)" }

  return (
    <div
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${boxes[size]} ${className}`}
      style={style}
    >
      {initialsFor(name)}
    </div>
  )
}
