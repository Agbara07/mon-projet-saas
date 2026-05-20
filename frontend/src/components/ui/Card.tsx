import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?:  'green' | 'blue' | 'gold' | 'none'
  hover?: boolean
  glass?: boolean
}

export function Card({ className, glow = 'none', hover = false, glass = false, ...props }: CardProps) {
  const glowMap = {
    green: 'hover:shadow-glow-green hover:border-green-300',
    blue:  'hover:shadow-glow-blue  hover:border-blue-300',
    gold:  'hover:shadow-glow-gold  hover:border-yellow-300',
    none:  '',
  }
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300',
        glass && 'glass',
        glow !== 'none' && glowMap[glow],
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
  return <h3 className={cn('font-semibold text-gray-900 leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-gray-500', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}
