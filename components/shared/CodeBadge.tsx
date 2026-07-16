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
        'bg-[#0B6E76]/10 text-[#0B6E76] font-mono font-semibold border border-[#0B6E76]/25',
        className
      )}
    >
      {code}
    </span>
  )
}
