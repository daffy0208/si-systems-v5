import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DriftLevel } from './types'

/**
 * Utility for merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determine drift level based on score
 * Lower score = better alignment, higher score = more drift
 */
export function getDriftLevel(score: number): DriftLevel {
  if (score < 0.2) return 'safe'
  if (score < 0.4) return 'warning'
  return 'danger'
}

/**
 * Get color for drift level
 */
export function getDriftColor(level: DriftLevel): string {
  const colors = {
    safe: '#10b981',    // green-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444',  // red-500
  }
  return colors[level]
}

/**
 * Format drift score as percentage (inverted for display)
 * Lower drift score = higher alignment percentage
 */
export function formatAlignmentScore(driftScore: number): string {
  const alignmentPercent = Math.round((1 - driftScore) * 100)
  return `${alignmentPercent}%`
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func(...args)
      }, remaining)
    }
  }
}
