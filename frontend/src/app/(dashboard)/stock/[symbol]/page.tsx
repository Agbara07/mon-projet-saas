'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Star, StarOff, Bell, RefreshCw,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PctBadge } from '@/components/ui/PctBadge'
import dynamic from 'next/dynamic'
import StockChart from './components/StockChart'
import OverviewTab from './components/OverviewTab'

const TabSkeleton = () => (
  <div className="p-4 space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-[var(--fin-hover)] animate-pulse rounded h-8" />
    ))}
  </div>
)

const FundamentalsTab = dynamic(() => import('./components/FundamentalsTab'), { loading: TabSkeleton })
const TechnicalTab    = dynamic(() => import('./components/TechnicalTab'),    { loading: TabSkeleton })
const NewsTab         = dynamic(() => import('./components/NewsTab'),         { loading: TabSkeleton })

/* ── Types ──────────────────────────────────────────────────────── */
interface Quote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; marketCap?: number
  pe?: number; week52High?: number; week52Low?: number; currency: string
}
interface StockProfile extends Quote {
  sector?: string; industry?: string; description?: string
  website?: string; employees?: number; country?: string
  beta?: number; dividendYield?: number; eps?: number
}
interface HistoricalPoint { date: string; open: number; high: number; low: number; close: number; volume: number }

type Tab = 'overview' | 'fundamentals' | 'technical' | 'news'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',     label: "Vue d'ensemble" },
  { key: 'fundamentals', label: 'Fondamentaux'   },
  { key: 'technical',    label: 'Technique'      },
  { key: 'news',         label: 'Actualités'     },
]

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

function fmtVol(n: number) {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`
  return String(n)
}

/* ── 52-week progress bar ────────────────────────────────────────── */
function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = high > low ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100)) : 50
  return (
    <div className="flex items-center gap-2 text-[9px] font-mono">
      <span className="text-[var(--fin-red)] w-12 text-right">${low.toFixed(0)}</span>
      <div className="relative flex-1 h-1 bg-[var(--fin-hover)] rounded-full overflow-hidden min-w-[60px]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--fin-red)] to-[var(--fin-green)] rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--fin-blue)] border-2 border-white shadow"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <span className="text-[var(--fin-green)] w-12">${high.toFixed(0)}</span>
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[var(--fin-hover)] animate-pulse rounded', className)} />
}

function HeaderSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-[var(--fin-border)] bg-[var(--fin-surface)]">
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-3" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function StockPage() {
  const params = useParams()
  const symbol = ((params.symbol as string) ?? '').toUpperCase()

  const [quote,      setQuote]      = useState<Quote | null>(null)
  const [profile,    setProfile]    = useState<StockProfile | null>(null)
  const [historical, setHistorical] = useState<HistoricalPoint[]>([])
  const [period,     setPeriod]     = useState('1mo')
  const [loading,    setLoading]    = useState(true)
  const [chartLoad,  setChartLoad]  = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('overview')
  const [inWatchlist, setInWatchlist] = useState(false)

  const firstPeriodLoad = useRef(true)

  /* Initial load — quote + profile + historical 1mo in parallel */
  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    firstPeriodLoad.current = true  // reset so period effect skips on symbol change
    Promise.allSettled([
      api.get(`/market/${symbol}/quote`),
      api.get(`/market/${symbol}/profile`),
      api.get(`/market/${symbol}/historical?period=1mo`),
    ]).then(([q, p, h]) => {
      if (q.status === 'fulfilled') setQuote(q.value.data)
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (h.status === 'fulfilled') setHistorical(h.value.data)
      setLoading(false)
    })
  }, [symbol])

  /* Period change — re-fetch historical only */
  useEffect(() => {
    if (firstPeriodLoad.current) { firstPeriodLoad.current = false; return }
    if (!symbol) return
    setChartLoad(true)
    api.get(`/market/${symbol}/historical?period=${period}`)
      .then(r => setHistorical(r.data))
      .catch(() => {})
      .finally(() => setChartLoad(false))
  }, [period, symbol])

  const toggleWatchlist = async () => {
    if (!quote) return
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${symbol}`)
        setInWatchlist(false)
        toast.success(`${symbol} retiré de la watchlist`)
      } else {
        await api.post('/watchlist', { symbol, companyName: quote.name })
        setInWatchlist(true)
        toast.success(`${symbol} ajouté à la watchlist`)
      }
    } catch {
      toast.error('Erreur watchlist')
    }
  }

  /* ── Error state ────────────────────────────────────────────── */
  if (!loading && !quote) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
      <div className="text-4xl font-mono font-bold text-[var(--fin-t3)]">{symbol}</div>
      <p className="text-sm text-[var(--fin-t2)]">Symbole introuvable ou données indisponibles</p>
      <p className="text-[10px] text-[var(--fin-t3)]">Vérifiez le symbole et réessayez</p>
      <Link href="/screener" className="text-[11px] text-[var(--fin-blue)] hover:underline mt-2">
        ← Retour au screener
      </Link>
    </div>
  )

  const q = quote
  const p = profile ?? quote

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Status bar ────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]',
        'bg-[var(--fin-panel)]'
      )}>
        <Link href="/screener"
          className="flex items-center gap-1 text-[10px] text-[var(--fin-t3)] hover:text-[var(--fin-t1)] transition-colors">
          <ArrowLeft size={10} strokeWidth={2} /> Screener
        </Link>
        <div className="w-px h-3.5 bg-[var(--fin-border)]" />
        <span className="bb-ticker text-[11px]">{symbol}</span>
        {profile?.sector && (
          <span className="text-[9px] text-[var(--fin-t3)]">{profile.sector}</span>
        )}
        <div className="flex-1" />
        <button
          onClick={toggleWatchlist}
          aria-label={inWatchlist ? 'Retirer de la watchlist' : 'Ajouter à la watchlist'}
          className={cn(
            'flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium transition-colors',
            inWatchlist
              ? 'text-[var(--fin-amber)] bg-[var(--fin-amber-bg)]'
              : 'text-[var(--fin-t3)] hover:text-[var(--fin-amber)] hover:bg-[var(--fin-amber-bg)]'
          )}
        >
          {inWatchlist ? <StarOff size={10} strokeWidth={1.5} /> : <Star size={10} strokeWidth={1.5} />}
          {inWatchlist ? 'Retirer' : 'Watchlist'}
        </button>
        <Link href="/alerts"
          className="flex items-center gap-1 h-6 px-2 rounded text-[10px] text-[var(--fin-t3)] hover:text-[var(--fin-blue)] hover:bg-[var(--fin-blue-bg)] transition-colors">
          <Bell size={10} strokeWidth={1.5} /> Alerte
        </Link>
      </div>

      {/* ── Quote header ─────────────────────────────────────── */}
      {loading ? <HeaderSkeleton /> : q && (
        <div className={cn(
          'px-4 py-3 border-b border-[var(--fin-border)] flex-shrink-0',
          'bg-[var(--fin-surface)]'
        )}>
          {/* Name + symbol */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="bb-ticker text-lg mr-2">{symbol}</span>
              <span className="text-[11px] text-[var(--fin-t2)]">{p?.name}</span>
            </div>
            <span className="text-[9px] font-mono text-[var(--fin-t3)] mt-1">{q.currency}</span>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="kf-num text-3xl font-bold text-[var(--fin-t1)]">
              ${q.price.toFixed(2)}
            </span>
            <span className={cn(
              'text-sm font-mono font-bold',
              q.changePercent >= 0 ? 'text-[var(--fin-green)]' : 'text-[var(--fin-red)]'
            )}>
              {q.changePercent >= 0 ? '+' : ''}{q.change.toFixed(2)}
            </span>
            <PctBadge value={q.changePercent} size="md" />
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[var(--fin-t3)]">Vol:</span>
              <span className="font-mono font-bold text-[var(--fin-t1)]">{fmtVol(q.volume)}</span>
            </div>
            {q.marketCap && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-[var(--fin-t3)]">Mkt Cap:</span>
                <span className="font-mono font-bold text-[var(--fin-t1)]">{fmt(q.marketCap)}</span>
              </div>
            )}
            {q.pe && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-[var(--fin-t3)]">P/E:</span>
                <span className="font-mono font-bold text-[var(--fin-t1)]">{q.pe.toFixed(1)}</span>
              </div>
            )}
            {profile?.beta && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-[var(--fin-t3)]">Beta:</span>
                <span className="font-mono font-bold text-[var(--fin-t1)]">{profile.beta.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* 52-week range */}
          {q.week52Low != null && q.week52High != null && (
            <div className="mt-2 flex items-center gap-2 text-[9px] text-[var(--fin-t3)]">
              <span className="font-bold uppercase tracking-wide">52s</span>
              <RangeBar low={q.week52Low} high={q.week52High} current={q.price} />
            </div>
          )}
        </div>
      )}

      {/* ── Chart ────────────────────────────────────────────── */}
      {!loading && (
        <StockChart
          data={historical}
          period={period}
          onPeriodChange={setPeriod}
          loading={chartLoad}
        />
      )}

      {/* ── Tabs nav ─────────────────────────────────────────── */}
      {!loading && (
        <div className={cn(
          'flex items-center flex-shrink-0 border-b border-[var(--fin-border)]',
          'bg-[var(--fin-panel)]'
        )}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'border-[var(--fin-blue)] text-[var(--fin-blue)]'
                  : 'border-transparent text-[var(--fin-t3)] hover:text-[var(--fin-t2)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
            <RefreshCw size={14} strokeWidth={1.5} className="animate-spin mr-2" />
            <span className="text-xs font-mono">CHARGEMENT...</span>
          </div>
        ) : (
          <AnimatePresence>
            {activeTab === 'overview' && (
              <OverviewTab key="overview" symbol={symbol} profile={profile} quote={quote} />
            )}
            {activeTab === 'fundamentals' && (
              <FundamentalsTab key="fundamentals" symbol={symbol} />
            )}
            {activeTab === 'technical' && (
              <TechnicalTab key="technical" symbol={symbol} historical={historical} />
            )}
            {activeTab === 'news' && (
              <NewsTab key="news" symbol={symbol} />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
