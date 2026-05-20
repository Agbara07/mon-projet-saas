import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 border font-semibold transition-colors',
  {
    variants: {
      variant: {
        green:  'bg-green-500/10  border-green-500/20  text-green-400',
        blue:   'bg-blue-500/10   border-blue-500/20   text-blue-400',
        gold:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        red:    'bg-red-500/10    border-red-500/20    text-red-400',
        white:  'bg-white/5       border-white/10      text-gray-300',
        outline:'border-white/10  bg-transparent       text-gray-400',
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
