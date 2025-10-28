/**
 * Client wrapper for SI Systems drift detection
 * Provides a simple interface for detecting drift and managing history
 */

import { DriftDetector } from '@si-systems/core'
import type { Identity, DriftScore, InteractionContext } from '@si-systems/core'
import type { DriftHistory, DriftDataPoint } from './types'

export class DriftClient {
  private detector: DriftDetector
  private history: DriftDataPoint[] = []
  private maxHistoryPoints: number

  constructor(identity: Identity, threshold: number = 0.2, maxHistoryPoints: number = 50) {
    this.detector = new DriftDetector(identity, threshold)
    this.maxHistoryPoints = maxHistoryPoints
  }

  /**
   * Detect drift for a given interaction
   */
  async detectDrift(context: InteractionContext): Promise<DriftScore> {
    const score = await this.detector.detectDrift(context)

    // Add to history
    this.addToHistory({
      timestamp: Date.now(),
      score: score.overall,
      dimensions: score.dimensions,
    })

    return score
  }

  /**
   * Add a data point to history
   */
  private addToHistory(point: DriftDataPoint): void {
    this.history.push(point)

    // Keep only the last N points
    if (this.history.length > this.maxHistoryPoints) {
      this.history = this.history.slice(-this.maxHistoryPoints)
    }
  }

  /**
   * Get drift history
   */
  getHistory(): DriftHistory {
    return {
      points: [...this.history],
      maxPoints: this.maxHistoryPoints,
    }
  }

  /**
   * Get the most recent drift score
   */
  getLatestScore(): DriftDataPoint | null {
    if (this.history.length === 0) return null
    return this.history[this.history.length - 1]
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = []
  }
}

/**
 * Create a sample identity for demo purposes
 */
export function createSampleIdentity(): Identity {
  return {
    tone: ['formal', 'empathetic'],
    communicationRhythm: 'thoughtful',
    coreValues: ['transparency', 'honesty', 'respect'],
    decisionMakingStyle: 'analytical',
    informationPreference: 'examples',
    emotionalTone: 'measured',
    contextLevel: 'moderate',
  }
}
