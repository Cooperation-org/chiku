/** Compact relative date used by the backlog table: today / 1d / 3w / 2mo / 1y. */
export function formatRelativeDate(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1d"
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
  if (diffDays < 30 * 12) return `${Math.floor(diffDays / 30)}mo`
  return `${Math.floor(diffDays / 365)}y`
}
