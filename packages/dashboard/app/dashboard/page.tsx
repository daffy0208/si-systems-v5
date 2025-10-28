'use client'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useDriftData } from '@/hooks/useDriftData'

export default function DashboardPage() {
  const { currentScore, history, isLoading, error } = useDriftData(3000)

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {error.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell
      currentScore={currentScore}
      history={history}
      isLoading={isLoading}
    />
  )
}
