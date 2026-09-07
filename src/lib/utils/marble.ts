/**
 * A deterministic "marble" background derived from a full name.
 *
 * Two people whose initials coincide ("Alex Alkhateeb" vs "Alicia Alan") get
 * clearly different gradients: the name is hashed (FNV-1a) and the hash seeds
 * three hue stops plus their blob positions — same name, same marble, always.
 */
export function marbleGradient(name: string): string {
  // FNV-1a 32-bit
  let hash = 2166136261
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const h = Math.abs(hash)

  const hueA = h % 360
  const hueB = (hueA + 30 + (h % 90)) % 360
  const hueC = (hueA + 150 + ((h >> 5) % 120)) % 360

  const x1 = 15 + (h % 70)
  const y1 = 10 + ((h >> 3) % 40)
  const x2 = 60 + ((h >> 7) % 35)
  const y2 = 15 + ((h >> 9) % 55)
  const x3 = 30 + ((h >> 11) % 55)
  const y3 = 55 + ((h >> 13) % 40)

  return [
    `radial-gradient(circle at ${x1}% ${y1}%, hsl(${hueA} 70% 62% / 0.85) 0%, transparent 52%)`,
    `radial-gradient(circle at ${x2}% ${y2}%, hsl(${hueB} 55% 46% / 0.8) 0%, transparent 58%)`,
    `radial-gradient(circle at ${x3}% ${y3}%, hsl(${hueC} 50% 38% / 0.75) 0%, transparent 62%)`,
    `hsl(${hueA} 40% 28%)`,
  ].join(", ")
}
