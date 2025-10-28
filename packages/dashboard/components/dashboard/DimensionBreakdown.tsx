'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getDriftLevel, getDriftColor, formatAlignmentScore } from '@/lib/utils'
import type { DimensionData } from '@/lib/types'

interface DimensionBreakdownProps {
  dimensions: {
    toneAlignment: number
    valueAlignment: number
    rhythmAlignment: number
    contextAlignment: number
  }
}

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps) {
  // Transform dimensions into chart data
  const data: DimensionData[] = React.useMemo(() => {
    return [
      {
        name: 'tone',
        label: 'Tone',
        value: dimensions.toneAlignment,
        color: getDriftColor(getDriftLevel(dimensions.toneAlignment)),
      },
      {
        name: 'value',
        label: 'Values',
        value: dimensions.valueAlignment,
        color: getDriftColor(getDriftLevel(dimensions.valueAlignment)),
      },
      {
        name: 'rhythm',
        label: 'Rhythm',
        value: dimensions.rhythmAlignment,
        color: getDriftColor(getDriftLevel(dimensions.rhythmAlignment)),
      },
      {
        name: 'context',
        label: 'Context',
        value: dimensions.contextAlignment,
        color: getDriftColor(getDriftLevel(dimensions.contextAlignment)),
      },
    ]
  }, [dimensions])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dimension Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis type="number" domain={[0, 1]} hide />
            <YAxis dataKey="label" type="category" width={60} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null
                const data = payload[0].payload as DimensionData
                return (
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium">{data.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Drift: {(data.value * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Alignment: {formatAlignmentScore(data.value)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {data.map((dim) => (
            <div key={dim.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: dim.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {dim.label}: {formatAlignmentScore(dim.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
