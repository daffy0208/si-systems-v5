'use client'

import * as React from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DriftScoreGauge } from './DriftScoreGauge'
import { DimensionBreakdown } from './DimensionBreakdown'
import { DriftHistoryChart } from './DriftHistoryChart'
import { FlagAlertsList } from './FlagAlertsList'
import type { DriftScore, DriftDataPoint } from '@/lib/types'

interface DashboardShellProps {
  currentScore: DriftScore | null
  history: DriftDataPoint[]
  isLoading?: boolean
}

export function DashboardShell({ currentScore, history, isLoading }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              SI Systems Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time identity alignment monitoring
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-50 rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 dark:text-slate-400 mt-4">Loading dashboard...</p>
            </div>
          </div>
        ) : !currentScore ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 mx-auto mb-4 text-slate-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                No data available
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Start a conversation to see drift detection in action. The dashboard will update in real-time as interactions are analyzed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero section - Drift Score Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DriftScoreGauge
                  score={currentScore.overall}
                  confidence={currentScore.confidence}
                />
              </div>
              <div>
                <FlagAlertsList
                  flags={currentScore.flags}
                  overallScore={currentScore.overall}
                />
              </div>
            </div>

            {/* Dimensions and History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DimensionBreakdown dimensions={currentScore.dimensions} />
              <DriftHistoryChart history={history} />
            </div>

            {/* Recommendation */}
            {currentScore.recommendation && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Recommendation
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {currentScore.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
