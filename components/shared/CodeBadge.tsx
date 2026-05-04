import { cn } from '@/lib/utils'

interface CodeBadgeProps {
  code: string
  className?: string
}

export function CodeBadge({ code, className }: CodeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs',
        'bg-white/10 text-cyan-300 font-mono border border-white/10',
        className
      )}
    >
      {code}
    </span>
  )
}
