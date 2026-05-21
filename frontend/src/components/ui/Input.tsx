import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--fin-t2)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fin-t3)]">{leftIcon}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-[var(--fin-surface)] border border-[var(--fin-border)]',
            'text-[var(--fin-t1)] placeholder:text-[var(--fin-t3)]',
            'rounded-lg px-4 py-2.5 text-sm',
            'transition-colors duration-150',
            'focus:outline-none focus:border-[var(--fin-blue)] focus:ring-2 focus:ring-[var(--fin-blue-bg)]',
            'hover:border-[var(--fin-border-2)]',
            error && 'border-[var(--fin-red)] focus:border-[var(--fin-red)] focus:ring-[var(--fin-red-bg)]',
            leftIcon  && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fin-t3)]">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-[var(--fin-red)]">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
export { Input }
