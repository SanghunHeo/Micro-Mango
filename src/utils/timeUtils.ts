/**
 * Format elapsed time in a human-readable format
 * - Under 60 seconds: "45.3s"
 * - Under 1 hour: "5m 30s"
 * - 1 hour or more: "1h 23m"
 */
export function formatTime(ms: number | undefined): string {
  if (!ms) return '0.0s'

  const totalSeconds = ms / 1000

  // Under 60 seconds: show with decimal
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  // 1 hour or more: show hours and minutes
  if (hours >= 1) {
    return `${hours}h ${minutes}m`
  }

  // Under 1 hour: show minutes and seconds
  return `${minutes}m ${seconds}s`
}
