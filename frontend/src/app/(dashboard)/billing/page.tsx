'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Zap, Check, Crown, Star, Shield,
  Clock, ArrowRight, ExternalLink, AlertTriangle,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

/* ── Types ─────────────────────────────────────────────────── */
interface BillingInfo {
  plan:          string
  effectivePlan: string
  trialActive:   boolean
  trialDaysLeft: number
  trialEndsAt:   string | null
  subscription:  { status: string; currentPeriodEnd: string | null } | null
  stripePriceIds: { STARTER: string | null; PRO: string | null; ADVISOR: string | null }
}

/* ── Config plans ───────────────────────────────────────────── */
const PLANS = [
  {
    key:      'FREE',
    name:     'Gratuit',
    price:    '0',
    icon:     <Shield size={18}/>,
    color:    'var(--fin-t3)',
    features: [
      '1 portfolio',
      '10 titres en watchlist',
      '5 alertes actives',
      'BRVM temps réel',
      '1 an d\'historique',
      'Dashboard marché',
    ],
    cta: null,
  },
  {
    key:      'STARTER',
    name:     'Starter',
    price:    '9',
    icon:     <Zap size={18}/>,
    color:    'var(--fin-blue)',
    features: [
      'Portfolios illimités',
      'Watchlist illimitée',
      '50 alertes actives',
      'Screener actions + ETF',
      '3 ans d\'historique',
      'App mobile',
    ],
    cta: 'STARTER',
  },
  {
    key:      'PRO',
    name:     'Pro',
    price:    '29',
    badge:    'Populaire',
    icon:     <Star size={18}/>,
    color:    'var(--fin-green)',
    features: [
      'Tout Starter',
      '500 alertes actives',
      '10 ans d\'historique',
      'Export CSV',
      'Accès API',
      'Alertes WebSocket instantanées',
    ],
    cta: 'PRO',
  },
  {
    key:      'ADVISOR',
    name:     'Advisor',
    price:    '79',
    icon:     <Crown size={18}/>,
    color:    'var(--fin-amber)',
    features: [
      'Tout Pro',
      'Portefeuilles clients',
      'Rapports PDF (200/mois)',
      'Screener fonds',
      'Features conseiller',
      'Support prioritaire',
    ],
    cta: 'ADVISOR',
  },
]

/* ── Page ───────────────────────────────────────────────────── */
export default function BillingPage() {
  const [info,    setInfo]    = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    api.get('/billing/info')
      .then(r => setInfo(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCheckout = async (planKey: string) => {
    if (!info) return
    const priceId = info.stripePriceIds[planKey as keyof typeof info.stripePriceIds]
    if (!priceId) return
    setPaying(planKey)
    setError(null)
    try {
      const r = await api.post('/billing/checkout', { priceId })
      window.location.href = r.data.url
    } catch {
      setError('Impossible de démarrer le paiement. Réessayez dans un instant.')
    } finally {
      setPaying(null)
    }
  }

  const handlePortal = async () => {
    setPaying('portal')
    setError(null)
    try {
      const r = await api.post('/billing/portal')
      window.location.href = r.data.url
    } catch {
      setError('Impossible d\'accéder au portail Stripe. Réessayez dans un instant.')
    } finally {
      setPaying(null)
    }
  }

  const currentPlan = info?.effectivePlan ?? 'FREE'
  const hasSub = info?.subscription?.status === 'ACTIVE' || info?.subscription?.status === 'PAST_DUE'

  return (
    <div className="flex flex-col h-full overflow-auto">

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <Crown size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Abonnement</span>
        {!loading && info && (
          <>
            <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
            <span className="text-[10px] font-mono text-[var(--fin-t2)]">
              Plan actuel : <span className="font-bold text-[var(--fin-t1)]">{currentPlan}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">

        {/* Trial banner */}
        {info?.trialActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--fin-amber)]/30 bg-[var(--fin-amber-bg)]"
          >
            <Clock size={15} className="text-[var(--fin-amber)] flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--fin-t1)]">
                Trial Pro actif — encore {info.trialDaysLeft} jour{info.trialDaysLeft > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[var(--fin-t3)] mt-0.5">
                Tu bénéficies de toutes les fonctionnalités Pro jusqu'au{' '}
                {info.trialEndsAt ? new Date(info.trialEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''}
              </p>
            </div>
            <Button variant="gold" size="sm" onClick={() => handleCheckout('PRO')} loading={paying === 'PRO'}>
              Passer à Pro
            </Button>
          </motion.div>
        )}

        {/* Erreur checkout / portal */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Trial expired warning */}
        {info && !info.trialActive && info.plan === 'FREE' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-surface)]">
            <AlertTriangle size={14} className="text-[var(--fin-t3)] flex-shrink-0"/>
            <p className="text-xs text-[var(--fin-t3)]">
              Ton trial est terminé. Tu es sur le plan gratuit avec des fonctionnalités limitées.
            </p>
          </div>
        )}

        {/* Plans grid */}
        <div>
          <h2 className="text-sm font-bold text-[var(--fin-t1)] mb-4">Choisir un plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan, i) => {
              const isActive = currentPlan === plan.key
              const priceId  = plan.cta ? info?.stripePriceIds[plan.cta as keyof typeof info.stripePriceIds] : null
              const canBuy   = !!priceId && !isActive

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    'relative flex flex-col rounded-xl border p-5 transition-colors',
                    isActive
                      ? 'border-[var(--fin-green)] bg-[var(--fin-surface)]'
                      : 'border-[var(--fin-border)] bg-[var(--fin-panel)] hover:border-[var(--fin-border-2)]'
                  )}
                >
                  {/* Badge populaire */}
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--fin-green)] text-white whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}

                  {/* Badge actif */}
                  {isActive && (
                    <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--fin-green)]/20 text-[var(--fin-green)] border border-[var(--fin-green)]/30 whitespace-nowrap">
                      Plan actuel
                    </span>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `color-mix(in srgb, ${plan.color} 15%, transparent)`, color: plan.color }}>
                      {plan.icon}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--fin-t1)] text-sm">{plan.name}</p>
                      <p className="text-xs text-[var(--fin-t3)]">
                        {plan.price === '0' ? 'Gratuit' : `$${plan.price}/mois`}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[11px] text-[var(--fin-t2)]">
                        <Check size={10} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }}/>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.cta && (
                    <Button
                      variant={plan.key === 'PRO' ? 'brand' : 'outline'}
                      size="sm"
                      className="w-full"
                      disabled={isActive || !canBuy}
                      loading={paying === plan.key}
                      rightIcon={canBuy ? <ArrowRight size={13}/> : undefined}
                      onClick={() => canBuy && handleCheckout(plan.cta!)}
                    >
                      {isActive ? 'Actif' : !canBuy ? 'Indisponible' : 'Choisir'}
                    </Button>
                  )}
                  {!plan.cta && (
                    <Button variant="ghost" size="sm" className="w-full" disabled>
                      {isActive ? 'Plan actuel' : 'Gratuit'}
                    </Button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Gestion abonnement existant */}
        {hasSub && (
          <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)]">
            <div>
              <p className="text-sm font-semibold text-[var(--fin-t1)]">Gérer mon abonnement</p>
              <p className="text-xs text-[var(--fin-t3)] mt-0.5">
                Modifier le plan, changer le moyen de paiement, télécharger les factures
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ExternalLink size={12}/>}
              loading={paying === 'portal'}
              onClick={handlePortal}
            >
              Portail Stripe
            </Button>
          </div>
        )}

        {/* Note prix HT */}
        <p className="text-center text-[10px] text-[var(--fin-t3)]">
          Prix en USD · facturation mensuelle · annulation à tout moment
        </p>
      </div>
    </div>
  )
}
