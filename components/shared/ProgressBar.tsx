'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number       // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ value, showLabel = false, size = 'md', className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  const color =
    clampedValue <= 33 ? 'bg-red-400' :
    clampedValue <= 66 ? 'bg-amber-400' :
    'bg-green-400'

  const height = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-black/10 rounded-full overflow-hidden', height)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-black/60 font-mono w-8 text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  )
}
