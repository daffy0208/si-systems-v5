'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getDriftLevel } from '@/lib/utils'

interface FlagAlertsListProps {
  flags: string[]
  overallScore: number
}

export function FlagAlertsList({ flags, overallScore }: FlagAlertsListProps) {
  const level = getDriftLevel(overallScore)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Active Alerts</CardTitle>
          <Badge variant={level}>
            {flags.length} {flags.length === 1 ? 'flag' : 'flags'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mx-auto mb-2 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No drift detected</p>
            <p className="text-xs mt-1">All dimensions within alignment threshold</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flags.map((flag, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    level === 'danger'
                      ? 'text-red-500'
                      : level === 'warning'
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {flag}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
