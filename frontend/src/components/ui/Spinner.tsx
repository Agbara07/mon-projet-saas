import { cn } from '@/lib/utils'

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <svg className={cn('animate-spin text-green-500', sizes[size], className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black">
      <Spinner size="lg"/>
      <p className="text-zinc-500 text-sm">Chargement...</p>
    </div>
  )
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-4 bg-zinc-900 rounded shimmer', className)}/>
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 space-y-3', className)}>
      <SkeletonLine className="w-1/3 h-3"/>
      <SkeletonLine className="w-2/3 h-6"/>
      <SkeletonLine className="w-1/2 h-3"/>
    </div>
  )
}
