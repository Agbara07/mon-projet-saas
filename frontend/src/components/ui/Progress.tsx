import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  color?: 'green' | 'blue' | 'gold' | 'red'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const colorMap = {
  green: 'bg-[var(--fin-green)]',
  blue:  'bg-[var(--fin-blue)]',
  gold:  'bg-[var(--fin-amber)]',
  red:   'bg-[var(--fin-red)]',
}

const sizeMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function Progress({ value, max = 100, className, color = 'green', showLabel, size = 'md' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full', className)}>
      <ProgressPrimitive.Root
        className={cn('relative overflow-hidden rounded-full bg-[var(--fin-surface)]', sizeMap[size])}
        value={pct}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full rounded-full transition-all duration-700 ease-out', colorMap[color])}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
      {showLabel && (
        <p className="text-xs text-[var(--fin-t3)] mt-1 text-right">{pct.toFixed(0)}%</p>
      )}
    </div>
  )
}
