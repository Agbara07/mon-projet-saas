import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:   'bg-white text-black hover:bg-gray-100 shadow-lg shadow-white/10',
        brand:     'bg-brand-500 text-black hover:bg-brand-400 shadow-lg shadow-brand-500/20',
        gold:      'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20',
        outline:   'border border-white/10 text-gray-300 hover:text-white hover:border-white/25 hover:bg-white/5',
        ghost:     'text-gray-400 hover:text-white hover:bg-white/5',
        danger:    'bg-red-600 text-white hover:bg-red-500',
        glass:     'glass text-white hover:border-white/15',
      },
      size: {
        xs:  'h-7 px-3 text-xs rounded-lg',
        sm:  'h-8 px-4 text-sm rounded-lg',
        md:  'h-10 px-5 text-sm rounded-xl',
        lg:  'h-12 px-7 text-base rounded-xl',
        xl:  'h-14 px-10 text-base rounded-2xl',
        icon:'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), loading && 'opacity-70 cursor-wait', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
)
Button.displayName = 'Button'
export { Button, buttonVariants }
