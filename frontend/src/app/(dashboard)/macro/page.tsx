'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, RefreshCw, TrendingUp, TrendingDown, Minus, Globe } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────────── */
interface MacroIndicator {
  id: string; name: string; value: number; unit: string
  date: string; change?: number; yoy?: number; trend: 'up' | 'down' | 'stable'
  history: { date: string; value: number }[]
}
interface USMacroDashboard { updatedAt: string; indicators: MacroIndicator[] }

interface UEMOAIndicator {
  name: string; value: number; unit: string; previousYear: number
  trend: 'hausse' | 'baisse' | 'stable'; impact: 'positif' | 'négatif' | 'neutre'
  description: string
}
interface UEMOADashboard {
  lastUpdated: string; bceaoRate: number; inflation: number; gdpGrowth: number
  indicators: UEMOAIndicator[]
}

type Region = 'us' | 'uemoa'

/* ── Helpers ─────────────────────────────────────────────────────── */
const INDICATOR_META: Record<string, { icon: string; description: string }> = {
  FEDFUNDS:          { icon: '🏦', description: 'Taux directeur de la Réserve Fédérale américaine' },
  CPIAUCSL:          { icon: '🛒', description: 'Inflation des prix à la consommation (glissement annuel)' },
  UNRATE:            { icon: '👷', description: 'Part de la population active sans emploi' },
  DGS10:             { icon: '📈', description: 'Rendement des obligations d\'État américaines à 10 ans' },
  A191RL1Q225SBEA:   { icon: '📊', description: 'Variation trimestrielle annualisée du PIB réel' },
}

function trendColor(trend: string) {
  if (trend === 'up')     return 'text-[var(--fin-green)]'
  if (trend === 'down')   return 'text-[var(--fin-red)]'
  return 'text-[var(--fin-t3)]'
}

function trendBg(trend: string) {
  if (trend === 'up')   return 'bg-[var(--fin-green-bg)]'
  if (trend === 'down') return 'bg-[var(--fin-red-bg)]'
  return 'bg-[var(--fin-hover)]'
}

function TrendIcon({ trend, size = 12 }: { trend: string; size?: number }) {
  if (trend === 'up')   return <TrendingUp   size={size} strokeWidth={1.5} />
  if (trend === 'down') return <TrendingDown size={size} strokeWidth={1.5} />
  return <Minus size={size} strokeWidth={1.5} />
}

/* ── Mini sparkline ──────────────────────────────────────────────── */
function MiniChart({ data, trend }: { data: { date: string; value: number }[]; trend: string }) {
  const color = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#6b7280'
  if (!data.length) return <div className="h-12 w-full bg-[var(--fin-hover)] rounded animate-pulse" />
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`mg-${trend}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          contentStyle={{ background:'#1f2937', border:'none', borderRadius:6, fontSize:10, color:'#f9fafb' }}
          formatter={(v: number) => [v.toFixed(2), '']}
          labelFormatter={(l: string) => l}
        />
        <Area
          type="monotone" dataKey="value"
          stroke={color} strokeWidth={1.5}
          fill={`url(#mg-${trend})`}
          dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── KPI card ────────────────────────────────────────────────────── */
function MacroCard({ ind }: { ind: MacroIndicator }) {
  const meta   = INDICATOR_META[ind.id]
  const change = ind.yoy ?? ind.change
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {meta && <span className="text-sm">{meta.icon}</span>}
            <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">{ind.id}</span>
          </div>
          <p className="text-[11px] font-medium text-[var(--fin-t2)]">{ind.name}</p>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold',
          trendBg(ind.trend), trendColor(ind.trend)
        )}>
          <TrendIcon trend={ind.trend} size={10} />
          {change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}${ind.id === 'CPIAUCSL' ? '%' : ''}` : ''}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold font-mono text-[var(--fin-t1)]">
          {ind.value.toFixed(2)}
        </span>
        <span className="text-[10px] text-[var(--fin-t3)]">{ind.unit}</span>
      </div>

      {/* Sparkline */}
      <MiniChart data={ind.history} trend={ind.trend} />

      {/* Date + description */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-[var(--fin-t3)]">{ind.date}</span>
        {meta && (
          <span className="text-[8px] text-[var(--fin-t3)] text-right max-w-[140px] leading-snug hidden sm:block">
            {meta.description}
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* ── UEMOA card ──────────────────────────────────────────────────── */
function UEMOACard({ ind }: { ind: UEMOAIndicator }) {
  const trend = ind.trend === 'hausse' ? 'up' : ind.trend === 'baisse' ? 'down' : 'stable'
  const yoy   = ((ind.value - ind.previousYear) / Math.abs(ind.previousYear)) * 100
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-medium text-[var(--fin-t2)]">{ind.name}</p>
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold',
          trendBg(trend), trendColor(trend)
        )}>
          <TrendIcon trend={trend} size={10} />
          {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-xl font-bold font-mono text-[var(--fin-t1)]">{ind.value.toFixed(1)}</span>
        <span className="text-[10px] text-[var(--fin-t3)]">{ind.unit}</span>
      </div>
      <p className="text-[9px] text-[var(--fin-t3)] leading-relaxed line-clamp-2">{ind.description}</p>
    </motion.div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4 space-y-3">
      <div className="h-3 w-20 bg-[var(--fin-hover)] animate-pulse rounded" />
      <div className="h-8 w-28 bg-[var(--fin-hover)] animate-pulse rounded" />
      <div className="h-12 bg-[var(--fin-hover)] animate-pulse rounded" />
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function MacroPage() {
  const [region,   setRegion]   = useState<Region>('us')
  const [usData,   setUsData]   = useState<USMacroDashboard | null>(null)
  const [uemData,  setUemData]  = useState<UEMOADashboard | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    const endpoint = region === 'us' ? '/market/macro/us' : '/market/macro/uemoa'
    api.get(endpoint)
      .then(r => {
        if (region === 'us')    setUsData(r.data)
        else                    setUemData(r.data)
      })
      .catch(e => setError(e?.response?.data?.error ?? 'Données indisponibles'))
      .finally(() => setLoading(false))
  }, [region])

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]',
        'bg-[var(--fin-panel)]'
      )}>
        <BarChart2 size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]" />
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">
          Macro-économique
        </span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]" />

        {/* Region selector */}
        {(['us', 'uemoa'] as Region[]).map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              'flex items-center gap-1 h-6 px-2.5 rounded text-[9px] font-bold font-mono uppercase transition-colors',
              region === r
                ? 'bg-[var(--fin-blue)] text-white'
                : 'text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)]'
            )}
          >
            <Globe size={9} />
            {r === 'us' ? 'États-Unis' : 'UEMOA'}
          </button>
        ))}

        <div className="flex-1" />
        {loading && <RefreshCw size={10} strokeWidth={2} className="text-[var(--fin-t3)] animate-spin" />}
        {region === 'us' && usData && (
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            Source : FRED · {new Date(usData.updatedAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* Error — FRED_API_KEY manquante */}
        {error && (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <div className="text-3xl">🏦</div>
            <p className="text-sm font-medium text-[var(--fin-t2)]">
              {error.includes('FRED_API_KEY') ? 'Clé FRED manquante' : 'Données indisponibles'}
            </p>
            {error.includes('FRED_API_KEY') ? (
              <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-4 text-left max-w-md">
                <p className="text-[10px] text-[var(--fin-t3)] mb-2">Pour activer les données macro US :</p>
                <ol className="text-[10px] text-[var(--fin-t2)] space-y-1 list-decimal list-inside">
                  <li>Créez un compte gratuit sur <span className="font-mono text-[var(--fin-blue)]">fred.stlouisfed.org</span></li>
                  <li>Générez une clé API (instantané)</li>
                  <li>Ajoutez <span className="font-mono text-[var(--fin-amber)]">FRED_API_KEY=votre_clé</span> dans <span className="font-mono">.env</span></li>
                </ol>
              </div>
            ) : (
              <p className="text-[10px] text-[var(--fin-t3)]">{error}</p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* US data */}
        {!loading && !error && region === 'us' && usData && (
          <AnimatePresence>
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-4 flex-wrap">
                {usData.indicators.map(ind => (
                  <div key={ind.id} className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[var(--fin-t3)]">{ind.name.split(' ')[0]} :</span>
                    <span className={cn('font-mono font-bold', trendColor(ind.trend))}>
                      {ind.value.toFixed(2)} {ind.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {usData.indicators.map((ind, i) => (
                  <motion.div key={ind.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <MacroCard ind={ind} />
                  </motion.div>
                ))}
              </div>

              <p className="text-[9px] text-[var(--fin-t3)]">
                Source : Federal Reserve Bank of St. Louis (FRED) · Mise à jour automatique
              </p>
            </div>
          </AnimatePresence>
        )}

        {/* UEMOA data */}
        {!loading && !error && region === 'uemoa' && uemData && (
          <AnimatePresence>
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Taux BCEAO', value: `${uemData.bceaoRate}%`, color: 'text-[var(--fin-blue)]' },
                  { label: 'Inflation',  value: `${uemData.inflation}%`, color: uemData.inflation > 3 ? 'text-[var(--fin-red)]' : 'text-[var(--fin-green)]' },
                  { label: 'Croissance PIB', value: `${uemData.gdpGrowth}%`, color: uemData.gdpGrowth > 0 ? 'text-[var(--fin-green)]' : 'text-[var(--fin-red)]' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg p-3 text-center">
                    <p className="text-[9px] text-[var(--fin-t3)] uppercase tracking-wide mb-1">{kpi.label}</p>
                    <p className={cn('text-xl font-bold font-mono', kpi.color)}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Indicators grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uemData.indicators.map((ind, i) => (
                  <motion.div key={ind.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <UEMOACard ind={ind} />
                  </motion.div>
                ))}
              </div>

              <p className="text-[9px] text-[var(--fin-t3)]">
                Source : BCEAO · FMI · UEMOA · Données statiques actualisées trimestriellement
              </p>
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
