import * as React from 'react'
import { cn } from '@/lib/utils'
import { DriftLevel } from '@/lib/types'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DriftLevel | 'default'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50': variant === 'default',
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': variant === 'safe',
          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400': variant === 'warning',
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
        },
        className
      )}
      {...props}
    />
  )
}
