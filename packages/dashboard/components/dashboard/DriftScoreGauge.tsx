'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { getDriftLevel, getDriftColor, formatAlignmentScore } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

interface DriftScoreGaugeProps {
  score: number
  confidence: number
}

export function DriftScoreGauge({ score, confidence }: DriftScoreGaugeProps) {
  const level = getDriftLevel(score)
  const color = getDriftColor(level)

  // Convert drift score to alignment percentage for display
  const alignmentPercent = (1 - score) * 100

  const data = [
    {
      name: 'Alignment',
      value: alignmentPercent,
      fill: color,
    },
  ]

  return (
    <Card className={`drift-transition ${
      level === 'safe'
        ? 'drift-glow-safe'
        : level === 'warning'
        ? 'drift-glow-warning'
        : 'drift-glow-danger'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Identity Alignment</CardTitle>
          <Badge variant={level}>
            {level === 'safe' ? 'Aligned' : level === 'warning' ? 'Minor Drift' : 'Significant Drift'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              barSize={20}
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={10}
                fill={color}
                className="drift-transition"
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className={`text-5xl font-bold drift-transition ${
              level === 'safe'
                ? 'drift-safe'
                : level === 'warning'
                ? 'drift-warning'
                : 'drift-danger'
            }`}>
              {formatAlignmentScore(score)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Confidence: {Math.round(confidence * 100)}%
            </div>
          </div>
        </div>

        {/* Status description */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {level === 'safe' && 'AI responses are well-aligned with your identity'}
            {level === 'warning' && 'Some responses show minor drift from your identity'}
            {level === 'danger' && 'Significant drift detected - review recommended'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
