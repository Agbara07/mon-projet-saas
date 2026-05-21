'use client'

import { cn } from '@/lib/utils'

/**
 * PctBadge — badge de variation Koyfin-style.
 * Couleur pastel, monospace, pas de flashy.
 * Utilise les CSS vars --fin-green/red pour dark + light.
 */
interface PctBadgeProps {
  value:      number
  className?: string
  showArrow?: boolean
  size?:      'xs' | 'sm' | 'md'
}

export function PctBadge({
  value,
  className,
  showArrow = true,
  size      = 'sm',
}: PctBadgeProps) {
  const up   = value > 0
  const flat = value === 0

  const sizeMap = {
    xs: 'text-[9px]  px-1   py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[11px] px-2   py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded font-bold tabular-nums leading-none font-mono',
        flat  ? 'kf-flat' : up ? 'kf-up' : 'kf-dn',
        sizeMap[size],
        className,
      )}
      aria-label={`${up ? 'Hausse' : flat ? 'Stable' : 'Baisse'} de ${Math.abs(value).toFixed(2)}%`}
    >
      {showArrow && !flat && (
        <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      )}
      {up ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}
