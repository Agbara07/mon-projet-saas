import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        /* fond contrasté qui fonctionne dans les deux thèmes */
        primary:   'bg-[var(--fin-t1)] text-[var(--fin-panel)] hover:opacity-90 shadow-sm',
        brand:     'bg-[var(--fin-green)] text-white hover:opacity-90 shadow-sm shadow-[var(--fin-green-bg)]',
        gold:      'bg-[var(--fin-amber)] text-white hover:opacity-90 shadow-sm',
        /* outline + ghost via vars CSS → dark ET light */
        outline:   'border border-[var(--fin-border-2)] text-[var(--fin-t2)] hover:text-[var(--fin-t1)] hover:border-[var(--fin-blue)] hover:bg-[var(--fin-hover)]',
        ghost:     'text-[var(--fin-t2)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)]',
        danger:    'bg-[var(--fin-red)] text-white hover:opacity-90',
        glass:     'bg-[var(--fin-panel)]/80 backdrop-blur border border-[var(--fin-border)] text-[var(--fin-t1)] hover:border-[var(--fin-border-2)]',
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
      <span className="inline-flex items-center">
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (leftIcon ?? null)}
      </span>
      {children}
      {!loading && rightIcon}
    </button>
  )
)
Button.displayName = 'Button'
export { Button, buttonVariants }
