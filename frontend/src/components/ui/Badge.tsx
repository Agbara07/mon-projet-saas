import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 border font-semibold transition-colors',
  {
    variants: {
      variant: {
        green:  'bg-[var(--fin-green-bg)]  border-[var(--fin-green)]  text-[var(--fin-green)]',
        blue:   'bg-[var(--fin-blue-bg)]   border-[var(--fin-blue)]   text-[var(--fin-blue)]',
        gold:   'bg-[var(--fin-amber-bg)]  border-[var(--fin-amber)]  text-[var(--fin-amber)]',
        purple: 'bg-purple-500/10          border-purple-500/30       text-purple-600 dark:text-purple-400',
        red:    'bg-[var(--fin-red-bg)]    border-[var(--fin-red)]    text-[var(--fin-red)]',
        white:  'bg-[var(--fin-surface)]   border-[var(--fin-border-2)] text-[var(--fin-t2)]',
        outline:'border-[var(--fin-border-2)] bg-transparent           text-[var(--fin-t3)]',
      },
      size: {
        sm: 'text-xs px-2 py-0.5 rounded-md',
        md: 'text-xs px-3 py-1   rounded-full',
        lg: 'text-sm px-4 py-1.5 rounded-full',
      },
    },
    defaultVariants: { variant: 'white', size: 'md' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}
