import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatProps {
  label: string
  value: string | number
  change?: number
  prefix?: string
  suffix?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Stat({ label, value, change, prefix, suffix, className, size = 'md' }: StatProps) {
  const trend = change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : null

  return (
    <div className={cn('flex flex-col', className)}>
      <p className={cn('text-zinc-500 font-medium', size === 'sm' ? 'text-xs' : 'text-xs mb-1')}>{label}</p>
      <p className={cn(
        'font-bold text-white tabular-nums',
        size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl'
      )}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{suffix}
      </p>
      {trend && change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs font-semibold',
          trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'
        )}>
          {trend === 'up' ? <TrendingUp size={12}/> : trend === 'down' ? <TrendingDown size={12}/> : <Minus size={12}/>}
          {change > 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      )}
    </div>
  )
}
