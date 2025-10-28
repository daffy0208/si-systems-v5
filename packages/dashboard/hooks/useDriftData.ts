'use client'

import * as React from 'react'
import type { DriftScore, DriftDataPoint } from '@/lib/types'

interface UseDriftDataReturn {
  currentScore: DriftScore | null
  history: DriftDataPoint[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for fetching and managing drift detection data
 * Polls the API at regular intervals for real-time updates
 */
export function useDriftData(pollInterval: number = 3000): UseDriftDataReturn {
  const [currentScore, setCurrentScore] = React.useState<DriftScore | null>(null)
  const [history, setHistory] = React.useState<DriftDataPoint[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const response = await fetch('/api/drift')
      if (!response.ok) {
        throw new Error('Failed to fetch drift data')
      }

      const data = await response.json()
      setCurrentScore(data.currentScore)
      setHistory(data.history)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching drift data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling
  React.useEffect(() => {
    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [fetchData, pollInterval])

  return {
    currentScore,
    history,
    isLoading,
    error,
    refresh: fetchData,
  }
}
