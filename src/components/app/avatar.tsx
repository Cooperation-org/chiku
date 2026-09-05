import { initialsFor } from "@/lib/utils/initials"

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
  /** Background for the initials. Taiga gives every user a colour. */
  color?: string | null
  size?: keyof typeof boxes
  className?: string
}

export function Avatar({ name, photo, color, size = "md", className = "" }: AvatarProps) {
  const label = name ?? ""
  if (photo) {
    return (
      <img
        src={photo}
        alt={label}
        title={label}
        className={`rounded-full object-cover ${boxes[size]} ${className}`}
      />
    )
  }
  return (
    <div
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${boxes[size]} ${className}`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {initialsFor(name)}
    </div>
  )
}
