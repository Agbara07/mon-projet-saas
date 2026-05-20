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
      {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{leftIcon}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600',
            'rounded-xl px-4 py-2.5 text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/10',
            'hover:border-zinc-700',
            error && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
export { Input }
