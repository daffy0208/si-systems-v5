'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { formatTimestamp, getDriftLevel, getDriftColor } from '@/lib/utils'
import type { DriftDataPoint } from '@/lib/types'

interface DriftHistoryChartProps {
  history: DriftDataPoint[]
}

export function DriftHistoryChart({ history }: DriftHistoryChartProps) {
  const chartData = React.useMemo(() => {
    return history.map((point) => ({
      timestamp: point.timestamp,
      time: formatTimestamp(point.timestamp),
      score: point.score,
      // Convert to alignment percentage for better UX
      alignment: (1 - point.score) * 100,
    }))
  }, [history])

  // Determine overall trend color
  const latestScore = history[history.length - 1]?.score ?? 0
  const level = getDriftLevel(latestScore)
  const color = getDriftColor(level)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Drift History</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Last {history.length} interactions
        </p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
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
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1">History will appear after interactions are analyzed</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlignment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Alignment %',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12 },
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium">{data.time}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Alignment: {data.alignment.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Drift: {(data.score * 100).toFixed(1)}%
                        </p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="alignment"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#colorAlignment)"
                  className="drift-transition"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Threshold markers */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-600 dark:text-slate-400">&gt;80% Aligned</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">60-80% Minor Drift</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600 dark:text-slate-400">&lt;60% Significant</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
