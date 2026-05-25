'use client'

import { useState, useEffect } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, TrendingUp, TrendingDown, Plus, X,
  SlidersHorizontal, RefreshCw, Star, StarOff, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { PctBadge } from '@/components/ui/PctBadge'
import { Sparkline, generateSparkline } from '@/components/ui/Sparkline'

interface StockResult {
  symbol:string; name:string; price:number; change:number
  changePercent:number; volume:number; marketCap?:number
  pe?:number; week52High?:number; week52Low?:number; currency:string
}
interface Filters {
  minPrice:string; maxPrice:string
  minMarketCap:string; maxMarketCap:string
  minPE:string; maxPE:string
  minChangePercent:string; maxChangePercent:string
  minVolume:string; sector:string
}

const EMPTY: Filters = {
  minPrice:'', maxPrice:'',
  minMarketCap:'', maxMarketCap:'',
  minPE:'', maxPE:'',
  minChangePercent:'', maxChangePercent:'',
  minVolume:'', sector:'',
}

const SECTORS = [
  'Technology','Healthcare','Financials','Consumer Discretionary',
  'Consumer Staples','Energy','Industrials','Materials','Real Estate','Utilities',
]

const PAGE_SIZE = 50

const PRESETS = [
  { label:'TOP GAINERS',  tag:'+2%↑',   color:'text-[var(--fin-green)]', bg:'bg-[var(--fin-green-bg)]', filters:{ ...EMPTY, minChangePercent:'2' } },
  { label:'TOP LOSERS',   tag:'-2%↓',   color:'text-[var(--fin-red)]',   bg:'bg-[var(--fin-red-bg)]',   filters:{ ...EMPTY, maxChangePercent:'-2' } },
  { label:'VALUE',        tag:'P/E<15', color:'text-[var(--fin-amber)]', bg:'bg-[var(--fin-amber-bg)]', filters:{ ...EMPTY, maxPE:'15', minMarketCap:'10000000000' } },
  { label:'LARGE CAPS',  tag:'>100B',  color:'text-[var(--fin-blue)]',  bg:'bg-[var(--fin-blue-bg)]',  filters:{ ...EMPTY, minMarketCap:'100000000000' } },
  { label:'SMALL CAPS',  tag:'<10B',   color:'text-[var(--fin-amber)]', bg:'bg-[var(--fin-amber-bg)]', filters:{ ...EMPTY, maxMarketCap:'10000000000' } },
  { label:'HIGH VOLUME', tag:'>50M',   color:'text-[var(--fin-green)]', bg:'bg-[var(--fin-green-bg)]', filters:{ ...EMPTY, minVolume:'50000000' } },
]

function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

type SortKey = keyof StockResult
type SortDir = 'asc'|'desc'

const COLS: { key: SortKey; label: string; right?: boolean }[] = [
  { key:'symbol',        label:'SYMBOLE'  },
  { key:'price',         label:'PRIX',         right:true },
  { key:'changePercent', label:'VAR%',          right:true },
  { key:'volume',        label:'VOLUME',        right:true },
  { key:'marketCap',     label:'MARKET CAP',    right:true },
  { key:'pe',            label:'P/E',           right:true },
  { key:'week52High',    label:'52S HAUT',       right:true },
  { key:'week52Low',     label:'52S BAS',        right:true },
]

export default function ScreenerPage() {
  const [filters,      setFilters]     = useState<Filters>(EMPTY)
  const [results,      setResults]     = useState<StockResult[]>([])
  const [loading,      setLoading]     = useState(false)
  const [ran,          setRan]         = useState(false)
  const [sortKey,      setSortKey]     = useState<SortKey>('marketCap')
  const [sortDir,      setSortDir]     = useState<SortDir>('desc')
  const [showFilters,  setShowFilters] = useState(false)
  const [watchlist,    setWatchlist]   = useState<Set<string>>(new Set())
  const [page,         setPage]        = useState(1)

  const runScreener = async (overrides?: Partial<Filters>) => {
    setLoading(true); setRan(true); setPage(1)
    const f = { ...filters, ...overrides }
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k,v]) => { if (v !== '') params.set(k, v) })
    try {
      const r = await api.get(`/market/screener?${params}`)
      setResults(r.data)
    } catch { toast.error('Erreur screener') }
    setLoading(false)
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...results].sort((a,b) => {
    const va = (a[sortKey]??0) as number, vb = (b[sortKey]??0) as number
    return sortDir==='desc' ? vb-va : va-vb
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const exportCSV = () => {
    const header = COLS.map(c => c.label).join(',')
    const rows = sorted.map(s =>
      [s.symbol, s.name, s.price, s.changePercent, s.volume, s.marketCap??'', s.pe??'', s.week52High??'', s.week52Low??''].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `screener-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const toggleWatchlist = async (s: StockResult) => {
    if (watchlist.has(s.symbol)) {
      await api.delete(`/watchlist/${s.symbol}`)
      setWatchlist(p => { const n=new Set(p); n.delete(s.symbol); return n })
      toast.success(`${s.symbol} retiré`)
    } else {
      await api.post('/watchlist', { symbol:s.symbol, companyName:s.name })
      setWatchlist(p => new Set(p).add(s.symbol))
      toast.success(`${s.symbol} ajouté`)
    }
  }

  const activeCount = Object.values(filters).filter(v => v !== '').length

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className={cn('flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
        <Search size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Screener</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>

        {/* Presets — masqués sur mobile pour éviter le débordement */}
        <div className="hidden sm:flex items-center gap-1">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setFilters(p.filters); runScreener(p.filters) }}
              className={cn('flex items-center gap-1 h-5 px-2 rounded text-[9px] font-bold font-mono transition-colors', p.bg, p.color, 'hover:opacity-80')}>
              {p.label} <span className="opacity-70">{p.tag}</span>
            </button>
          ))}
        </div>

        <div className="flex-1"/>
        {ran && !loading && (
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            <span className="text-[var(--fin-t1)] font-bold">{sorted.length}</span> résultat{sorted.length>1?'s':''}
          </span>
        )}
        {ran && sorted.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-1 h-6 px-2 rounded text-[9px] text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] border border-[var(--fin-border)] transition-colors">
            ↓ CSV
          </button>
        )}
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <button onClick={() => setShowFilters(v => !v)}
          className={cn(
            'flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] transition-colors',
            showFilters
              ? 'bg-[var(--fin-active)] text-[var(--fin-blue)] border border-[var(--fin-blue)] border-opacity-30'
              : 'text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] border border-[var(--fin-border)]'
          )}>
          <SlidersHorizontal size={11} strokeWidth={1.5}/>
          Filtres{activeCount > 0 && <span className="font-bold text-[var(--fin-amber)]">({activeCount})</span>}
        </button>
        <button onClick={() => runScreener()}
          className="flex items-center gap-1.5 h-7 px-3 rounded text-[11px] font-medium bg-[var(--fin-blue)] text-white hover:opacity-90 transition-opacity">
          <Search size={11}/> Analyser
        </button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="overflow-hidden">
            <div className={cn('px-4 py-3 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Filtres personnalisés</span>
                {activeCount > 0 && (
                  <button onClick={() => setFilters(EMPTY)} className="flex items-center gap-1 text-[9px] text-[var(--fin-t3)] hover:text-[var(--fin-red)] transition-colors">
                    <X size={9}/> RÉINITIALISER
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">

                {/* Sector dropdown */}
                <div>
                  <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">Secteur</label>
                  <select
                    value={filters.sector}
                    onChange={e => setFilters(p => ({...p, sector:e.target.value}))}
                    className={cn(
                      'w-full h-7 px-2 text-xs font-mono rounded border transition-colors appearance-none',
                      'bg-[var(--fin-panel)] border-[var(--fin-border)] text-[var(--fin-t1)]',
                      'focus:outline-none focus:border-[var(--fin-blue)]',
                    )}>
                    <option value="">Tous les secteurs</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {[
                  { key:'minPrice',         label:'Prix min ($)',  type:'number' },
                  { key:'maxPrice',         label:'Prix max ($)',  type:'number' },
                  { key:'minMarketCap',     label:'Cap. min ($)',  type:'number' },
                  { key:'maxMarketCap',     label:'Cap. max ($)',  type:'number' },
                  { key:'minPE',            label:'P/E min',       type:'number' },
                  { key:'maxPE',            label:'P/E max',       type:'number' },
                  { key:'minChangePercent', label:'Var. min (%)',  type:'number' },
                  { key:'maxChangePercent', label:'Var. max (%)',  type:'number' },
                  { key:'minVolume',        label:'Volume min',    type:'number' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">{label}</label>
                    <input type="number"
                      value={filters[key as keyof Filters]}
                      onChange={e => setFilters(p => ({...p,[key]:e.target.value}))}
                      placeholder="—"
                      className={cn(
                        'w-full h-7 px-2 text-xs font-mono rounded border transition-colors',
                        'bg-[var(--fin-panel)] border-[var(--fin-border)] text-[var(--fin-t1)]',
                        'focus:outline-none focus:border-[var(--fin-blue)]',
                        'placeholder:text-[var(--fin-t3)]'
                      )}/>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
            <RefreshCw size={14} strokeWidth={1.5} className="animate-spin mr-2"/>
            <span className="text-xs font-mono">ANALYSE EN COURS...</span>
          </div>
        ) : !ran ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Search size={28} strokeWidth={1} className="text-[var(--fin-t3)] mb-3"/>
            <p className="text-sm font-medium text-[var(--fin-t2)]">Configurez vos critères et lancez l'analyse</p>
            <p className="text-[10px] text-[var(--fin-t3)] mt-1">Ou utilisez un preset ci-dessus pour démarrer rapidement</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Search size={24} strokeWidth={1} className="text-[var(--fin-t3)] mb-3"/>
            <p className="text-sm font-medium text-[var(--fin-t2)]">Aucun résultat</p>
            <p className="text-[10px] text-[var(--fin-t3)] mt-1">Élargissez vos critères de filtrage</p>
          </div>
        ) : (
          <table className="w-full min-w-[680px]">
            <thead className={cn('sticky top-0 z-10 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
              <tr>
                {COLS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className={cn(
                      'px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap',
                      'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] transition-colors',
                      sortKey===col.key && 'text-[var(--fin-blue)]',
                      col.right ? 'text-right' : 'text-left',
                      (col.key === 'week52High' || col.key === 'week52Low') && 'hidden md:table-cell'
                    )}>
                    {col.label}{sortKey===col.key ? (sortDir==='asc'?' ↑':' ↓') : ''}
                  </th>
                ))}
                <th className="px-3 py-1.5 w-16"/>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => {
                const up = s.changePercent >= 0
                const inWl = watchlist.has(s.symbol)
                return (
                  <motion.tr key={s.symbol}
                    initial={{opacity:0}} animate={{opacity:1}} transition={{delay:Math.min(i,15)*0.02}}
                    /* kf-row: 28px densité Koyfin */
                    className="kf-row group">
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        {/* bb-ticker: Bloomberg uppercase monospace */}
                        <Link href={`/stock/${s.symbol}`} className="bb-ticker hover:text-[var(--fin-blue)] transition-colors">
                          {s.symbol}
                        </Link>
                        <span className="text-[9px] text-[var(--fin-t3)] truncate max-w-[120px]">{s.name}</span>
                      </div>
                    </td>
                    {/* kf-num: prix monospace aligné */}
                    <td className="px-3 text-right">
                      <span className="kf-num text-xs font-bold text-[var(--fin-t1)]">${s.price.toFixed(2)}</span>
                    </td>
                    {/* PctBadge Koyfin muted */}
                    <td className="px-3 text-right">
                      <PctBadge value={s.changePercent} size="xs"/>
                    </td>
                    <td className="px-3 text-right">
                      <span className="kf-num text-[10px] text-[var(--fin-t2)]">
                        {s.volume >= 1e6 ? `${(s.volume/1e6).toFixed(1)}M` : s.volume >= 1e3 ? `${(s.volume/1e3).toFixed(0)}K` : String(s.volume)}
                      </span>
                    </td>
                    <td className="px-3 text-right"><span className="kf-num text-[10px] text-[var(--fin-t2)]">{fmt(s.marketCap)}</span></td>
                    <td className="px-3 text-right">
                      <span className="kf-num text-[10px] text-[var(--fin-t2)]">{s.pe != null ? s.pe.toFixed(1) : '—'}</span>
                    </td>
                    <td className="px-3 text-right hidden md:table-cell">
                      <span className="kf-num text-[10px] text-[var(--fin-green)]">{s.week52High != null ? `$${s.week52High.toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="px-3 text-right hidden md:table-cell">
                      <span className="kf-num text-[10px] text-[var(--fin-red)]">{s.week52Low != null ? `$${s.week52Low.toFixed(2)}` : '—'}</span>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleWatchlist(s)}
                          className={cn('w-6 h-6 rounded flex items-center justify-center transition-colors',
                            inWl ? 'text-[var(--fin-amber)] hover:bg-[var(--fin-amber-bg)]' : 'text-[var(--fin-t3)] hover:text-[var(--fin-amber)] hover:bg-[var(--fin-amber-bg)]')}>
                          {inWl ? <StarOff size={11} strokeWidth={1.5}/> : <Star size={11} strokeWidth={1.5}/>}
                        </button>
                        <Link href={`/stock/${s.symbol}`}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--fin-t3)] hover:text-[var(--fin-blue)] hover:bg-[var(--fin-blue-bg)] transition-colors">
                          <Search size={11} strokeWidth={1.5}/>
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {ran && sorted.length > 0 && (
        <div className={cn('flex items-center gap-3 px-4 py-1.5 border-t border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            <span className="text-[var(--fin-t1)] font-bold">{sorted.length}</span> action{sorted.length>1?'s':''} · trié par <span className="text-[var(--fin-blue)] font-bold">{sortKey.toUpperCase()}</span> {sortDir==='desc'?'↓':'↑'}
          </span>
          {activeCount > 0 && <span className="text-[9px] font-mono text-[var(--fin-amber)]">{activeCount} filtre{activeCount>1?'s':''} actif{activeCount>1?'s':''}</span>}
          <div className="flex-1"/>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p-1)}
                className="h-5 px-2 rounded text-[9px] font-mono border border-[var(--fin-border)] text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] disabled:opacity-30 transition-colors">
                ‹
              </button>
              <span className="text-[9px] font-mono text-[var(--fin-t3)] px-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p+1)}
                className="h-5 px-2 rounded text-[9px] font-mono border border-[var(--fin-border)] text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] disabled:opacity-30 transition-colors">
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
