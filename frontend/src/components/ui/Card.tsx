import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?:  'green' | 'blue' | 'gold' | 'none'
  hover?: boolean
  glass?: boolean
}

export function Card({ className, glow = 'none', hover = false, glass = false, ...props }: CardProps) {
  const glowMap = {
    green: 'hover:shadow-[0_0_20px_rgba(14,122,90,0.20)] hover:border-[var(--fin-green)]',
    blue:  'hover:shadow-[0_0_20px_rgba(21,101,192,0.20)] hover:border-[var(--fin-blue)]',
    gold:  'hover:shadow-[0_0_20px_rgba(255,152,0,0.20)]  hover:border-[var(--fin-amber)]',
    none:  '',
  }
  return (
    <div
      className={cn(
        /* fond + bordure via vars CSS → s'adapte dark ET light */
        'rounded-xl border bg-[var(--fin-panel)] border-[var(--fin-border)]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.07)]',
        hover && 'transition-all duration-200 cursor-default hover:-translate-y-0.5 hover:border-[var(--fin-border-2)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
        glass && 'backdrop-blur-xl bg-[var(--fin-panel)]/80',
        glow !== 'none' && ['transition-all duration-200', glowMap[glow]],
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-semibold text-[var(--fin-t1)] leading-none tracking-tight', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[var(--fin-t2)]', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-5 pt-0 border-t border-[var(--fin-border)]', className)} {...props} />
  )
}
