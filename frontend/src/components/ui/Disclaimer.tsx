'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface DisclaimerProps {
  variant?: 'banner' | 'inline' | 'brvm'
  dismissible?: boolean
  className?: string
}

export function Disclaimer({ variant = 'inline', dismissible = false, className }: DisclaimerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (variant === 'brvm') {
    return (
      <div className={cn(
        'flex items-start gap-2.5 px-3 py-2 rounded-lg text-[11px]',
        'bg-amber-500/5 border border-amber-500/20 text-amber-400/80',
        className
      )}>
        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <p className="leading-relaxed">
          Les données BRVM/UEMOA affichées sont issues de sources publiques non officielles et peuvent
          présenter un délai ou des inexactitudes. Elles ne constituent pas des données de marché
          officielles au sens du CREPMF. Pour toute décision d&apos;investissement, consultez les
          publications officielles de la{' '}
          <a href="https://www.brvm.org" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-amber-300">
            BRVM
          </a>.
        </p>
        {dismissible && (
          <button onClick={() => setDismissed(true)} className="flex-shrink-0 hover:text-amber-300 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'w-full px-4 py-2 text-[10px] text-center',
        'bg-[var(--fin-surface)] border-b border-[var(--fin-border)]',
        'text-[var(--fin-t3)]',
        className
      )}>
        <span>
          InvestSaaS fournit des informations à titre éducatif uniquement. Ces informations ne
          constituent pas un conseil en investissement au sens de la réglementation AMF-UMOA /
          CREPMF.{' '}
          <Link href="/cgu" className="underline underline-offset-2 hover:text-[var(--fin-t2)]">
            CGU
          </Link>{' '}
          ·{' '}
          <Link href="/politique-confidentialite" className="underline underline-offset-2 hover:text-[var(--fin-t2)]">
            Confidentialité
          </Link>
        </span>
        {dismissible && (
          <button onClick={() => setDismissed(true)} className="ml-3 hover:text-[var(--fin-t1)] transition-colors">
            <X size={10} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]',
      'bg-[var(--fin-surface)] border border-[var(--fin-border)]',
      'text-[var(--fin-t3)]',
      className
    )}>
      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-[var(--fin-amber)]" />
      <p className="leading-relaxed">
        Les informations affichées sont fournies à titre éducatif et informatif uniquement.
        Elles ne constituent pas un conseil en investissement personnalisé au sens de la
        réglementation AMF-UMOA / CREPMF. InvestSaaS n&apos;est pas agréé SGI (Société de
        Gestion et d&apos;Intermédiation). Toute décision d&apos;investissement relève de
        votre responsabilité exclusive.
      </p>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 hover:text-[var(--fin-t1)] transition-colors">
          <X size={11} />
        </button>
      )}
    </div>
  )
}
