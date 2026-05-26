'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Euro, TrendingUp, TrendingDown, RefreshCw, Search,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  DollarSign, Flame, Building2, Users, ExternalLink,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── Types ────────────────────────────────────────────────── */
interface EuronextQuote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; sector?: string; currency?: string
}
interface EuropeanIndex {
  symbol: string; name: string; price: number; change: number
  changePercent: number; country: string; flag: string
}
interface ForexPair {
  symbol: string; name: string; base: string; quote: string
  price: number; change: number; changePercent: number
}
interface Commodity {
  symbol: string; name: string; price: number; change: number
  changePercent: number; unit: string
}
interface Palmares {
  topGainers: EuronextQuote[]; topLosers: EuronextQuote[]
  unchanged: EuronextQuote[]; updatedAt: string
}
interface InsiderTx {
  symbol: string; filingDate: string; transactionDate: string
  reportingName: string; transactionType: string
  securitiesOwned: number; securitiesTransacted: number
  price?: number; totalValue?: number; securityName: string
}
interface Overview {
  palmares: Palmares | null
  indices: EuropeanIndex[]
  forex: ForexPair[]
  commodities: Commodity[]
  updatedAt: string
}

/* ── Helpers ──────────────────────────────────────────────── */
const fmtPrice = (n: number, currency = 'EUR') =>
  n.toLocaleString('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtVol = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n)

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const fmtValue = (n?: number) =>
  n == null ? '—' : n >= 1e9 ? `${(n / 1e9).toFixed(1)} Md€` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} M€` : n.toLocaleString('fr-FR')

const txTypeLabel = (t: string) => {
  if (t.includes('Purchase') || t === 'P') return { label: 'Achat',   cls: 'text-[var(--fin-green)] bg-[var(--fin-green-bg)]' }
  if (t.includes('Sale')     || t === 'S') return { label: 'Vente',   cls: 'text-[var(--fin-red)] bg-[var(--fin-red-bg)]'     }
  return                                          { label: t,          cls: 'text-[var(--fin-t2)] bg-[var(--fin-surface)]'     }
}

const SECTOR_PILL: Record<string, string> = {
  Luxe:          'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]',
  Finance:       'bg-[var(--fin-blue-bg)]  text-[var(--fin-blue)]',
  Technologie:   'bg-[var(--fin-blue-bg)]  text-[var(--fin-cyan)]',
  Santé:         'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
  Industrie:     'bg-[var(--fin-surface)]  text-[var(--fin-t2)]',
  Énergie:       'bg-[var(--fin-red-bg)]   text-[var(--fin-red)]',
  Automobile:    'bg-[var(--fin-surface)]  text-[var(--fin-t2)]',
  Consommation:  'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]',
  Matériaux:     'bg-[var(--fin-surface)]  text-[var(--fin-t2)]',
  Défense:       'bg-[var(--fin-red-bg)]   text-[var(--fin-red)]',
  Média:         'bg-[var(--fin-blue-bg)]  text-[var(--fin-blue)]',
  Télécoms:      'bg-[var(--fin-blue-bg)]  text-[var(--fin-cyan)]',
  Services:      'bg-[var(--fin-surface)]  text-[var(--fin-t2)]',
  Immobilier:    'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]',
}
const sectorPill = (s?: string) => SECTOR_PILL[s ?? ''] ?? 'bg-[var(--fin-surface)] text-[var(--fin-t2)]'

/* ── Sub-components ────────────────────────────────────────── */
function ChangeChip({ pct, size = 'sm' }: { pct: number; size?: 'sm' | 'xs' }) {
  const pos = pct >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-mono font-semibold rounded',
      size === 'xs' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5',
      pos ? 'text-[var(--fin-green)] bg-[var(--fin-green-bg)]' : 'text-[var(--fin-red)] bg-[var(--fin-red-bg)]',
    )}>
      {pos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
      {fmtPct(pct)}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[140, 80, 80, 70, 70, 60].map((w, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3 rounded bg-[var(--fin-hover)]" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

/* ── Tab: Palmarès ────────────────────────────────────────── */
function PalmaresTab({ palmares, loading }: { palmares: Palmares | null; loading: boolean }) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
      {[0, 1].map(i => (
        <div key={i} className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] p-4 animate-pulse space-y-3">
          <div className="h-4 w-32 bg-[var(--fin-hover)] rounded" />
          {[1,2,3,4,5].map(j => <div key={j} className="h-8 bg-[var(--fin-hover)] rounded" />)}
        </div>
      ))}
    </div>
  )
  if (!palmares) return <div className="p-6 text-center text-xs text-[var(--fin-t3)]">Données indisponibles</div>

  const PalCard = ({ title, items, color }: { title: string; items: EuronextQuote[]; color: string }) => (
    <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] overflow-hidden">
      <div className={cn('px-4 py-2.5 border-b border-[var(--fin-border)] flex items-center gap-2', color)}>
        {color.includes('green') ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="divide-y divide-[var(--fin-border)]">
        {items.map(q => (
          <div key={q.symbol} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--fin-hover)] transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--fin-t1)] truncate">{q.name}</p>
              <p className="text-[10px] text-[var(--fin-t3)] font-mono">{q.symbol}</p>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <p className="text-xs font-mono font-semibold text-[var(--fin-t1)]">{fmtPrice(q.price)}</p>
              <ChangeChip pct={q.changePercent} size="xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PalCard title="Meilleures hausses" items={palmares.topGainers} color="text-[var(--fin-green)]" />
        <PalCard title="Meilleures baisses" items={palmares.topLosers}  color="text-[var(--fin-red)]"   />
      </div>
      {palmares.unchanged.length > 0 && (
        <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] px-4 py-3 flex items-center gap-2">
          <Minus size={12} className="text-[var(--fin-t3)]" />
          <span className="text-xs text-[var(--fin-t2)]">
            <span className="font-semibold text-[var(--fin-t1)]">{palmares.unchanged.length}</span> valeur{palmares.unchanged.length > 1 ? 's' : ''} inchangée{palmares.unchanged.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Actions CAC 40 ─────────────────────────────────── */
function ActionsTab({ stocks, loading }: { stocks: EuronextQuote[]; loading: boolean }) {
  const [query, setQuery] = useState('')
  const [sort, setSort]   = useState<{ key: keyof EuronextQuote; asc: boolean }>({ key: 'changePercent', asc: false })

  const filtered = stocks
    .filter(s => query === '' || s.name.toLowerCase().includes(query.toLowerCase()) || s.symbol.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const va = a[sort.key] as number ?? 0
      const vb = b[sort.key] as number ?? 0
      return sort.asc ? va - vb : vb - va
    })

  const toggleSort = (key: keyof EuronextQuote) =>
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false })

  const SortTH = ({ label, col }: { label: string; col: keyof EuronextQuote }) => (
    <th
      onClick={() => toggleSort(col)}
      className="px-3 py-2 text-left cursor-pointer select-none hover:text-[var(--fin-t1)] transition-colors"
    >
      <span className="flex items-center gap-1">
        {label}
        {sort.key === col && <span className="text-[var(--fin-blue)]">{sort.asc ? '↑' : '↓'}</span>}
      </span>
    </th>
  )

  return (
    <div className="p-4 space-y-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fin-t3)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher une valeur…"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--fin-panel)] border border-[var(--fin-border)] rounded-md text-[var(--fin-t1)] placeholder:text-[var(--fin-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--fin-blue)]"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-[var(--fin-border)] text-[var(--fin-t3)] text-[10px] uppercase tracking-wide">
                <SortTH label="Valeur"     col="name"          />
                <SortTH label="Cours"      col="price"         />
                <SortTH label="Variation"  col="changePercent" />
                <SortTH label="Var. abs."  col="change"        />
                <SortTH label="Volume"     col="volume"        />
                <th className="px-3 py-2 text-left hidden sm:table-cell">Secteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fin-border)]">
              {loading
                ? Array(10).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : filtered.map(q => (
                    <tr key={q.symbol} className="hover:bg-[var(--fin-hover)] transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-[var(--fin-t1)]">{q.name}</p>
                        <p className="text-[10px] text-[var(--fin-t3)] font-mono">{q.symbol}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-[var(--fin-t1)]">
                        {fmtPrice(q.price)}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChangeChip pct={q.changePercent} />
                      </td>
                      <td className={cn('px-3 py-2.5 font-mono text-xs', q.change >= 0 ? 'text-[var(--fin-green)]' : 'text-[var(--fin-red)]')}>
                        {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--fin-t2)] font-mono">{fmtVol(q.volume)}</td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {q.sector && (
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', sectorPill(q.sector))}>
                            {q.sector}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[var(--fin-t3)]">{filtered.length} valeur{filtered.length > 1 ? 's' : ''} · CAC 40 — Euronext Paris</p>
    </div>
  )
}

/* ── Tab: Indices ─────────────────────────────────────────── */
function IndicesTab({ indices, loading }: { indices: EuropeanIndex[]; loading: boolean }) {
  if (loading) return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] p-4 animate-pulse space-y-2">
          <div className="h-3 w-20 bg-[var(--fin-hover)] rounded" />
          <div className="h-5 w-28 bg-[var(--fin-hover)] rounded" />
          <div className="h-4 w-16 bg-[var(--fin-hover)] rounded" />
        </div>
      ))}
    </div>
  )
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {indices.map(idx => (
          <motion.div
            key={idx.symbol}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] p-4 hover:border-[var(--fin-blue)] transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">{idx.flag}</span>
              <span className="text-[10px] text-[var(--fin-t3)]">{idx.country}</span>
            </div>
            <p className="text-xs font-bold text-[var(--fin-t1)] mb-1">{idx.name}</p>
            <p className="text-lg font-mono font-semibold text-[var(--fin-t1)] leading-none mb-1.5">
              {idx.price.toFixed(2)}
            </p>
            <ChangeChip pct={idx.changePercent} />
          </motion.div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[var(--fin-t3)]">
        Indices via ETF proxy — EWQ (CAC40), EWG (DAX), EWU (FTSE), FEZ (EuroStoxx50), EWN (AEX), EWI (MIB), EWP (IBEX35)
      </p>
    </div>
  )
}

/* ── Tab: Devises & Matières ──────────────────────────────── */
function DevisesTab({ forex, commodities, loading }: { forex: ForexPair[]; commodities: Commodity[]; loading: boolean }) {
  if (loading) return (
    <div className="p-4 space-y-6">
      {[5, 4].map((count, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-[var(--fin-hover)] rounded animate-pulse" />
          <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] divide-y divide-[var(--fin-border)]">
            {Array(count).fill(0).map((_, j) => (
              <div key={j} className="flex justify-between px-4 py-3 animate-pulse">
                <div className="h-3 w-20 bg-[var(--fin-hover)] rounded" />
                <div className="h-3 w-16 bg-[var(--fin-hover)] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon size={13} className="text-[var(--fin-t3)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--fin-t3)]">{title}</span>
      </div>
      <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] divide-y divide-[var(--fin-border)]">
        {children}
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-6">
      <Section title="Devises (EUR)" icon={Euro}>
        {forex.map(f => (
          <div key={f.symbol} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--fin-hover)] transition-colors">
            <div>
              <p className="text-xs font-semibold text-[var(--fin-t1)]">{f.name}</p>
              <p className="text-[10px] text-[var(--fin-t3)] font-mono">{f.symbol.replace('OANDA:', '')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-semibold text-[var(--fin-t1)]">{f.price.toFixed(4)}</p>
              <ChangeChip pct={f.changePercent} size="xs" />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Matières premières" icon={Flame}>
        {commodities.map(c => (
          <div key={c.symbol} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--fin-hover)] transition-colors">
            <div>
              <p className="text-xs font-semibold text-[var(--fin-t1)]">{c.name}</p>
              <p className="text-[10px] text-[var(--fin-t3)]">{c.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-semibold text-[var(--fin-t1)]">
                ${c.price.toFixed(2)}
              </p>
              <ChangeChip pct={c.changePercent} size="xs" />
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

/* ── Tab: Dirigeants ─────────────────────────────────────── */
function DirigeantTab() {
  const [symbol, setSymbol] = useState('MC.PA')
  const [input,  setInput]  = useState('MC.PA')
  const [data,   setData]   = useState<InsiderTx[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async (sym: string) => {
    if (!sym.trim()) return
    setLoading(true); setError('')
    try {
      const res = await api.get(`/market/${encodeURIComponent(sym.trim().toUpperCase())}/insider`)
      setData(res.data.transactions ?? [])
    } catch {
      setError('Données indisponibles — vérifiez le symbole ou la clé FMP')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(symbol) }, [symbol, load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSymbol(input.trim().toUpperCase())
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fin-t3)]" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Symbole (ex: MC.PA, AAPL…)"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--fin-panel)] border border-[var(--fin-border)] rounded-md text-[var(--fin-t1)] placeholder:text-[var(--fin-t3)] focus:outline-none focus:ring-1 focus:ring-[var(--fin-blue)]"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--fin-blue)] text-white rounded-md hover:opacity-90 transition-opacity"
        >
          <Search size={11} /> Chercher
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--fin-red-bg)] border border-[var(--fin-red)] border-opacity-30 rounded-lg">
          <span className="text-xs text-[var(--fin-red)]">{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--fin-border)] flex items-center gap-2">
          <Users size={12} className="text-[var(--fin-t3)]" />
          <span className="text-xs font-bold text-[var(--fin-t2)] uppercase tracking-wider">
            Transactions dirigeants — {symbol}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-[var(--fin-border)] text-[var(--fin-t3)] text-[10px] uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Dirigeant</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Qté</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">Prix</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">Valeur totale</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">Titres détenus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fin-border)]">
              {loading
                ? Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : data.length === 0 && !loading
                  ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--fin-t3)]">
                          Aucune transaction trouvée
                        </td>
                      </tr>
                    )
                  : data.map((tx, i) => {
                      const { label, cls } = txTypeLabel(tx.transactionType)
                      return (
                        <tr key={i} className="hover:bg-[var(--fin-hover)] transition-colors">
                          <td className="px-3 py-2.5 font-mono text-[var(--fin-t2)]">{tx.transactionDate?.slice(0, 10)}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-[var(--fin-t1)] truncate max-w-[140px]">{tx.reportingName}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cls)}>{label}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[var(--fin-t1)]">
                            {tx.securitiesTransacted.toLocaleString('fr-FR')}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[var(--fin-t2)] hidden sm:table-cell">
                            {tx.price ? `$${tx.price.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[var(--fin-t1)] hidden sm:table-cell">
                            {fmtValue(tx.totalValue)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[var(--fin-t2)] hidden md:table-cell">
                            {tx.securitiesOwned.toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      )
                    })
              }
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[var(--fin-t3)]">Source : Financial Modeling Prep (FMP) — Déclarations SEC Form 4</p>
    </div>
  )
}

/* ── TABS config ────────────────────────────────────────────── */
const TABS = [
  { id: 'palmares',   label: 'Palmarès',          Icon: TrendingUp  },
  { id: 'actions',    label: 'Actions CAC 40',     Icon: BarChart3   },
  { id: 'indices',    label: 'Indices',            Icon: Euro        },
  { id: 'devises',    label: 'Devises & Matières', Icon: DollarSign  },
  { id: 'dirigeants', label: 'Dirigeants',         Icon: Users       },
] as const

type TabId = typeof TABS[number]['id']

/* ── Main Page ──────────────────────────────────────────────── */
export default function EuronextPage() {
  const [tab,         setTab]         = useState<TabId>('palmares')
  const [overview,    setOverview]    = useState<Overview | null>(null)
  const [stocks,      setStocks]      = useState<EuronextQuote[]>([])
  const [loadingOver, setLoadingOver] = useState(true)
  const [loadingStocks, setLoadingStocks] = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState<string | null>(null)

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoadingOver(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/market/euronext')
      setOverview(res.data)
      setLastUpdate(res.data.updatedAt ? new Date(res.data.updatedAt).toLocaleTimeString('fr-FR') : null)
    } catch {
      if (!silent) toast.error('Impossible de charger les données Euronext')
    } finally {
      setLoadingOver(false)
      setRefreshing(false)
    }
  }, [])

  const loadStocks = useCallback(async () => {
    setLoadingStocks(true)
    try {
      const res = await api.get('/market/euronext/stocks')
      setStocks(res.data.quotes ?? [])
    } catch {
      toast.error('Impossible de charger les cotations CAC 40')
    } finally {
      setLoadingStocks(false)
    }
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  useEffect(() => {
    if (tab === 'actions' && stocks.length === 0) loadStocks()
  }, [tab, stocks.length, loadStocks])

  const handleRefresh = () => {
    loadOverview(true)
    if (tab === 'actions') loadStocks()
  }

  // Derive KPIs from overview
  const palmares   = overview?.palmares ?? null
  const indices    = overview?.indices  ?? []
  const forex      = overview?.forex    ?? []
  const commodities = overview?.commodities ?? []

  const allCAC     = palmares ? [...palmares.topGainers, ...palmares.topLosers, ...palmares.unchanged] : []
  const advancers  = palmares?.topGainers.length ?? 0
  const decliners  = palmares?.topLosers.length  ?? 0

  // Find a main index for header — try to find CAC40 proxy
  const cac40 = indices.find(i => i.name === 'CAC 40')

  return (
    <div className="flex flex-col h-full">
      {/* ── Status bar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[var(--fin-panel)] border-b border-[var(--fin-border)] px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max">
          <div className="flex items-center gap-2">
            <span className="text-sm">🇫🇷</span>
            <span className="text-xs font-bold text-[var(--fin-t1)]">Euronext Paris</span>
          </div>

          {loadingOver ? (
            <div className="flex gap-3">
              {[80, 70, 60].map(w => <div key={w} className="h-4 rounded bg-[var(--fin-hover)] animate-pulse" style={{ width: w }} />)}
            </div>
          ) : (
            <>
              {cac40 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--fin-t3)]">CAC 40</span>
                  <span className="font-mono font-semibold text-[var(--fin-t1)]">{cac40.price.toFixed(0)}</span>
                  <ChangeChip pct={cac40.changePercent} size="xs" />
                </div>
              )}
              {palmares && (
                <>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp size={10} className="text-[var(--fin-green)]" />
                    <span className="text-[var(--fin-green)] font-semibold">{advancers}</span>
                    <span className="text-[var(--fin-t3)]">hausse</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingDown size={10} className="text-[var(--fin-red)]" />
                    <span className="text-[var(--fin-red)] font-semibold">{decliners}</span>
                    <span className="text-[var(--fin-t3)]">baisse</span>
                  </div>
                </>
              )}
              {forex.find(f => f.name === 'EUR/USD') && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--fin-t3)]">EUR/USD</span>
                  <span className="font-mono font-semibold text-[var(--fin-t1)]">
                    {forex.find(f => f.name === 'EUR/USD')!.price.toFixed(4)}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {lastUpdate && <span className="text-[10px] text-[var(--fin-t3)]">Màj {lastUpdate}</span>}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={12} className={cn(refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[var(--fin-panel)] border-b border-[var(--fin-border)] px-4 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === id
                  ? 'border-[var(--fin-blue)] text-[var(--fin-blue)]'
                  : 'border-transparent text-[var(--fin-t3)] hover:text-[var(--fin-t2)]',
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'palmares'   && <PalmaresTab palmares={palmares} loading={loadingOver} />}
            {tab === 'actions'    && <ActionsTab stocks={stocks} loading={loadingStocks} />}
            {tab === 'indices'    && <IndicesTab indices={indices} loading={loadingOver} />}
            {tab === 'devises'    && <DevisesTab forex={forex} commodities={commodities} loading={loadingOver} />}
            {tab === 'dirigeants' && <DirigeantTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
