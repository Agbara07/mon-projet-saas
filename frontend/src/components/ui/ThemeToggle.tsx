'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
        'text-[var(--fin-t3)] hover:text-[var(--fin-t1)]',
        'hover:bg-[var(--fin-hover)] border border-transparent hover:border-[var(--fin-border)]',
        className
      )}
    >
      {theme === 'dark'
        ? <Sun  size={14} strokeWidth={1.5}/>
        : <Moon size={14} strokeWidth={1.5}/>
      }
    </button>
  )
}
