'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Lock, ArrowRight, Check } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface LimitDetail {
  resource: 'portfolios' | 'alerts' | 'watchlistItems'
  limit: number
  current: number
}

const RESOURCE_LABELS: Record<string, string> = {
  portfolios:    'portefeuille',
  alerts:        'alerte active',
  watchlistItems:'titre en watchlist',
}

const PLANS = [
  {
    name: 'Starter',
    price: '$9',
    color: 'var(--fin-blue)',
    features: ['Portfolios illimités', '50 alertes', 'Screener actions + ETF', '3 ans d\'historique'],
  },
  {
    name: 'Pro',
    price: '$29',
    color: 'var(--fin-green)',
    badge: 'Populaire',
    features: ['500 alertes', '10 ans d\'historique', 'Export CSV', 'Accès API'],
  },
  {
    name: 'Advisor',
    price: '$79',
    color: 'var(--fin-amber)',
    features: ['Portefeuilles clients', 'Rapports PDF', 'Fonds & comptes gérés', 'Features conseiller'],
  },
]

export function UpgradeModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<LimitDetail | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      setDetail((e as CustomEvent<LimitDetail>).detail)
      setOpen(true)
    }
    window.addEventListener('plan:limit-reached', handler)
    return () => window.removeEventListener('plan:limit-reached', handler)
  }, [])

  const label = detail ? RESOURCE_LABELS[detail.resource] ?? detail.resource : ''

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--fin-amber-bg)] flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-[var(--fin-amber)]" />
        </div>
        <div>
          <p className="font-bold text-[var(--fin-t1)] text-base">Limite de plan atteinte</p>
          {detail && (
            <p className="text-[var(--fin-t3)] text-sm mt-0.5">
              {detail.current}/{detail.limit} {label}{detail.limit > 1 ? 's' : ''} utilisé{detail.limit > 1 ? 's' : ''}
              {' '}— passez à un plan supérieur pour continuer
            </p>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="relative rounded-xl border border-[var(--fin-border)] bg-[var(--fin-surface)] p-4"
            style={{ borderColor: plan.badge ? 'var(--fin-green)' : undefined }}
          >
            {plan.badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--fin-green)] text-white">
                {plan.badge}
              </span>
            )}
            <p className="font-bold text-[var(--fin-t1)] text-sm">{plan.name}</p>
            <p className="font-black text-lg mt-1" style={{ color: plan.color }}>
              {plan.price}<span className="text-[var(--fin-t3)] text-xs font-normal">/mois</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-[var(--fin-t2)]">
                  <Check size={10} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        <Button
          variant="brand"
          size="md"
          className="flex-1"
          rightIcon={<ArrowRight size={15} />}
          onClick={() => { setOpen(false); router.push('/billing') }}
        >
          <Zap size={15} />
          Voir les plans
        </Button>
        <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
          Plus tard
        </Button>
      </div>
    </Modal>
  )
}
