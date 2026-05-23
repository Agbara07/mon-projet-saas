'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Users, Building2, TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { PctBadge } from '@/components/ui/PctBadge'

interface StockProfile {
  symbol: string; name: string; price: number; change: number; changePercent: number
  currency: string; sector?: string; industry?: string; description?: string
  website?: string; employees?: number; country?: string; marketCap?: number
  pe?: number; beta?: number; dividendYield?: number; eps?: number
  week52High?: number; week52Low?: number
}
interface DCFValuation { symbol: string; date: string; dcf: number; stockPrice: number; upside: number }

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--fin-border)] last:border-0">
      <span className="text-[10px] text-[var(--fin-t3)] font-medium">{label}</span>
      <span className={cn(
        'text-[11px] font-mono font-bold',
        highlight === 'green' ? 'text-[var(--fin-green)]' :
        highlight === 'red'   ? 'text-[var(--fin-red)]'   :
        'text-[var(--fin-t1)]'
      )}>
        {value}
      </span>
    </div>
  )
}

function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toFixed(2)}`
}

interface OverviewTabProps {
  symbol:  string
  profile: StockProfile | null
  quote:   { price: number; week52High?: number; week52Low?: number } | null
}

export default function OverviewTab({ symbol, profile, quote }: OverviewTabProps) {
  const [dcf,     setDCF]     = useState<DCFValuation | null>(null)
  const [dcfLoad, setDcfLoad] = useState(true)

  useEffect(() => {
    api.get(`/market/${symbol}/dcf`)
      .then(r => setDCF(r.data))
      .catch(() => {})
      .finally(() => setDcfLoad(false))
  }, [symbol])

  const p = profile

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      {/* Col 1 — Description + profil société */}
      <div className="lg:col-span-2 space-y-4">

        {/* Description */}
        {p?.description && (
          <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4">
            <div className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-2">À propos</div>
            <p className="text-[11px] text-[var(--fin-t2)] leading-relaxed line-clamp-4">{p.description}</p>
          </div>
        )}

        {/* Informations société */}
        <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4">
          <div className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-3">Informations</div>
          <div className="grid grid-cols-2 gap-x-6">
            <div className="space-y-1">
              <MetricRow label="Secteur"    value={p?.sector   ?? '—'} />
              <MetricRow label="Industrie"  value={p?.industry ?? '—'} />
              <MetricRow label="Pays"       value={p?.country  ?? '—'} />
              {p?.employees && (
                <MetricRow label="Employés" value={p.employees.toLocaleString('fr-FR')} />
              )}
            </div>
            <div className="space-y-1">
              <MetricRow label="Market Cap"    value={fmt(p?.marketCap)} />
              <MetricRow label="Cap. boursière" value={fmt(p?.marketCap)} />
              {p?.website && (
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--fin-border)]">
                  <span className="text-[10px] text-[var(--fin-t3)] font-medium">Site web</span>
                  <a
                    href={p.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-[var(--fin-blue)] hover:underline"
                  >
                    <Globe size={9} /> Visiter <ExternalLink size={8} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Col 2 — Ratios clés + DCF */}
      <div className="space-y-4">

        {/* Ratios clés */}
        <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4">
          <div className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-3">Ratios clés</div>
          <div className="space-y-0">
            <MetricRow label="P/E ratio"    value={p?.pe            != null ? p.pe.toFixed(1)            : '—'} />
            <MetricRow label="EPS"          value={p?.eps           != null ? `$${p.eps.toFixed(2)}`      : '—'} />
            <MetricRow label="Beta"         value={p?.beta          != null ? p.beta.toFixed(2)           : '—'} />
            <MetricRow label="Div. Yield"   value={p?.dividendYield != null ? `${p.dividendYield.toFixed(2)}%` : '—'} />
            <MetricRow
              label="52s Haut"
              value={quote?.week52High != null ? `$${quote.week52High.toFixed(2)}` : '—'}
              highlight="green"
            />
            <MetricRow
              label="52s Bas"
              value={quote?.week52Low != null ? `$${quote.week52Low.toFixed(2)}` : '—'}
              highlight="red"
            />
          </div>
        </div>

        {/* DCF Valuation */}
        <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4">
          <div className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-3">
            Valorisation DCF
          </div>

          {dcfLoad ? (
            <div className="flex items-center gap-2 text-[10px] text-[var(--fin-t3)]">
              <RefreshCw size={10} strokeWidth={1.5} className="animate-spin" />
              Calcul en cours...
            </div>
          ) : !dcf ? (
            <p className="text-[10px] text-[var(--fin-t3)]">Données DCF non disponibles</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold font-mono text-[var(--fin-t1)]">
                  ${dcf.dcf != null ? dcf.dcf.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] text-[var(--fin-t3)]">valeur intrinsèque</span>
              </div>

              <div className="space-y-1">
                <MetricRow label="Prix actuel" value={dcf.stockPrice != null ? `$${dcf.stockPrice.toFixed(2)}` : '—'} />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] text-[var(--fin-t3)] font-medium">Potentiel</span>
                  {dcf.upside != null ? <PctBadge value={dcf.upside} size="sm" /> : <span className="text-[11px] font-mono text-[var(--fin-t3)]">—</span>}
                </div>
              </div>

              <div className={cn(
                'mt-3 rounded px-3 py-2 text-[10px] font-bold text-center',
                dcf.upside > 20  ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)]' :
                dcf.upside > 0   ? 'bg-[var(--fin-blue-bg)] text-[var(--fin-blue)]'   :
                'bg-[var(--fin-red-bg)] text-[var(--fin-red)]'
              )}>
                {dcf.upside > 20  ? '✓ SOUS-ÉVALUÉ' :
                 dcf.upside > 0   ? '~ JUSTE VALEUR' :
                 '✗ SURÉVALUÉ'}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
