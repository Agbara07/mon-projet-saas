'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, Search, TrendingUp, TrendingDown, Trash2, RefreshCw, Plus, X, Radio } from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface WatchItem {
  id:string; symbol:string; companyName:string; addedAt:string
  quote:{ price:number; change:number; changePercent:number; volume:number; marketCap?:number; pe?:number }|null
}
interface SearchResult { symbol:string; name:string; exchange:string }
type SortKey = 'symbol'|'price'|'changePercent'|'volume'|'marketCap'|'pe'
type SortDir = 'asc'|'desc'

export default function WatchlistPage() {
  const [items,      setItems]     = useState<WatchItem[]>([])
  const [loading,    setLoading]   = useState(true)
  const [search,     setSearch]    = useState('')
  const [results,    setResults]   = useState<SearchResult[]>([])
  const [searching,  setSearching] = useState(false)
  const [showSearch, setShowSearch]= useState(false)
  const [sortKey,    setSortKey]   = useState<SortKey>('symbol')
  const [sortDir,    setSortDir]   = useState<SortDir>('asc')
  const [liveQuotes, setLiveQ]     = useState<Record<string,number>>({})
  const searchRef = useRef<HTMLInputElement>(null)

  const { connected, subscribe } = useWebSocket(msg => {
    if (msg.type === 'quotes') {
      const m: Record<string,number> = {}
      msg.data.forEach((q: any) => { m[q.symbol] = q.price })
      setLiveQ(p => ({...p,...m}))
    }
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/watchlist')
      setItems(r.data)
      if (r.data.length > 0) subscribe(r.data.map((i: WatchItem) => i.symbol))
    } catch { toast.error('Erreur chargement watchlist') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (showSearch) setTimeout(() => searchRef.current?.focus(), 50) }, [showSearch])

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try { const r = await api.get(`/market/search?q=${q}`); setResults(r.data.slice(0,8)) }
    catch {} finally { setSearching(false) }
  }
  useEffect(() => { const t = setTimeout(() => doSearch(search), 350); return () => clearTimeout(t) }, [search])

  const addToWatchlist = async (s: SearchResult) => {
    await api.post('/watchlist', { symbol: s.symbol, companyName: s.name })
    toast.success(`${s.symbol} ajouté`)
    setSearch(''); setResults([]); setShowSearch(false); load()
  }

  const remove = async (id: string, sym: string) => {
    await api.delete(`/watchlist/${id}`)
    toast.success(`${sym} supprimé`); load()
  }

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const sorted = [...items].sort((a,b) => {
    const av = sortKey==='symbol' ? a.symbol : (a.quote as any)?.[sortKey] ?? 0
    const bv = sortKey==='symbol' ? b.symbol : (b.quote as any)?.[sortKey] ?? 0
    if (av === bv) return 0
    const r = av > bv ? 1 : -1
    return sortDir==='asc' ? r : -r
  })

  const SH = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th onClick={() => handleSort(col)}
      className={cn(
        'px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap',
        'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] transition-colors',
        sortKey===col && 'text-[var(--fin-blue)]',
        right ? 'text-right' : 'text-left'
      )}>
      {label}{sortKey===col?(sortDir==='asc'?' ↑':' ↓'):''}
    </th>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className={cn('flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
        <Eye size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Watchlist</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <span className="text-[9px] font-mono text-[var(--fin-t3)]">
          <span className="text-[var(--fin-t1)] font-bold">{items.length}</span> titre{items.length>1?'s':''}
        </span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <Radio size={10} strokeWidth={1.5} className={connected?'text-[var(--fin-green)]':'text-[var(--fin-t3)]'}/>
        <span className={cn('text-[9px] font-mono', connected?'text-[var(--fin-green)]':'text-[var(--fin-t3)]')}>
          {connected?'TEMPS RÉEL':'OFFLINE'}
        </span>
        <div className="flex-1"/>
        <button onClick={load} className="w-7 h-7 rounded flex items-center justify-center text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors">
          <RefreshCw size={11} strokeWidth={1.5}/>
        </button>
        <button onClick={() => setShowSearch(v => !v)}
          className={cn('flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors',
            showSearch ? 'bg-[var(--fin-surface)] border border-[var(--fin-border)] text-[var(--fin-t2)]' : 'bg-[var(--fin-blue)] text-white hover:opacity-90')}>
          {showSearch ? <X size={11}/> : <Plus size={11}/>}
          {showSearch ? 'Fermer' : 'Ajouter'}
        </button>
      </div>

      {/* Search panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
            <div className={cn('px-4 py-2.5 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
              <div className="flex items-center gap-2">
                <Search size={12} className="text-[var(--fin-t3)] flex-shrink-0"/>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un titre (symbole ou nom)…"
                  className={cn('flex-1 text-xs font-mono bg-transparent outline-none','text-[var(--fin-t1)] placeholder:text-[var(--fin-t3)]')}/>
                {searching && <RefreshCw size={10} className="text-[var(--fin-t3)] animate-spin"/>}
              </div>
              {results.length > 0 && (
                <div className={cn('mt-2 rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
                  {results.map(r => (
                    <button key={r.symbol} onClick={() => addToWatchlist(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left border-b border-[var(--fin-border)] last:border-0 hover:bg-[var(--fin-hover)] transition-colors">
                      <span className="font-mono font-bold text-xs text-[var(--fin-t1)] w-16 flex-shrink-0">{r.symbol}</span>
                      <span className="text-[10px] text-[var(--fin-t2)] flex-1 truncate">{r.name}</span>
                      <span className="text-[9px] font-mono text-[var(--fin-t3)]">{r.exchange}</span>
                      <Plus size={10} strokeWidth={1.5} className="text-[var(--fin-blue)] flex-shrink-0"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
            <RefreshCw size={14} strokeWidth={1.5} className="animate-spin"/>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Eye size={24} strokeWidth={1} className="text-[var(--fin-t3)] mb-3"/>
            <p className="text-sm font-medium text-[var(--fin-t2)]">Watchlist vide</p>
            <p className="text-[10px] text-[var(--fin-t3)] mt-1 mb-4">Ajoutez des titres pour suivre leurs performances en temps réel.</p>
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-[var(--fin-blue)] text-white hover:opacity-90">
              <Plus size={11}/> Ajouter un titre
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className={cn('sticky top-0 z-10 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
              <tr>
                <SH col="symbol"        label="Symbole"/>
                <SH col="price"         label="Prix"      right/>
                <SH col="changePercent" label="Var%"      right/>
                <SH col="volume"        label="Volume"    right/>
                <SH col="marketCap"     label="Mkt Cap"   right/>
                <SH col="pe"            label="P/E"       right/>
                <th className="px-3 py-1.5 w-20"/>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => {
                const live = liveQuotes[item.symbol] ?? item.quote?.price ?? 0
                const chg  = item.quote?.changePercent ?? 0
                const up   = chg >= 0
                return (
                  <motion.tr key={item.id}
                    initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                    className={cn('border-b border-[var(--fin-border)] last:border-0 transition-colors group','hover:bg-[var(--fin-hover)]')}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[var(--fin-t1)]">{item.symbol}</span>
                        {connected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--fin-green)] animate-pulse"/>}
                        <span className="text-[9px] text-[var(--fin-t3)] truncate max-w-[120px]">{item.companyName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-[var(--fin-t1)] tabular-nums">
                      {live > 0 ? `$${live.toFixed(2)}` : '—'}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono text-xs font-bold tabular-nums', up?'text-[var(--fin-green)]':'text-[var(--fin-red)]')}>
                      {up?'▲':'▼'}{Math.abs(chg).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--fin-t2)] tabular-nums">
                      {item.quote?.volume ? (item.quote.volume>=1e6?`${(item.quote.volume/1e6).toFixed(1)}M`:`${(item.quote.volume/1e3).toFixed(0)}K`) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--fin-t2)] tabular-nums">
                      {item.quote?.marketCap ? (item.quote.marketCap>=1e12?`$${(item.quote.marketCap/1e12).toFixed(2)}T`:item.quote.marketCap>=1e9?`$${(item.quote.marketCap/1e9).toFixed(1)}B`:`$${(item.quote.marketCap/1e6).toFixed(0)}M`) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--fin-t2)] tabular-nums">
                      {item.quote?.pe != null ? item.quote.pe.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/stock/${item.symbol}`}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--fin-t3)] hover:text-[var(--fin-blue)] hover:bg-[var(--fin-blue-bg)] transition-colors">
                          <Eye size={11} strokeWidth={1.5}/>
                        </Link>
                        <button onClick={() => remove(item.id, item.symbol)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--fin-t3)] hover:text-[var(--fin-red)] hover:bg-[var(--fin-red-bg)] transition-colors">
                          <Trash2 size={11} strokeWidth={1.5}/>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div className={cn('flex items-center px-4 py-1.5 border-t border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            <span className="text-[var(--fin-t1)] font-bold">{items.length}</span> titre{items.length>1?'s':''} · trié par <span className="text-[var(--fin-blue)] font-bold">{sortKey.toUpperCase()}</span> {sortDir==='desc'?'↓':'↑'}
          </span>
        </div>
      )}
    </div>
  )
}
