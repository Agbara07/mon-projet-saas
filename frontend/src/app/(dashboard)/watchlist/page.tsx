'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Search, TrendingUp, TrendingDown, Trash2,
  Star, StarOff, ArrowUpRight, Zap, RefreshCw,
  BarChart3, DollarSign, Activity,
} from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn, formatPct } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'

interface WatchItem {
  id: string; symbol: string; companyName: string; addedAt: string
  quote: { price: number; change: number; changePercent: number; volume: number; marketCap?: number; pe?: number } | null
}
interface SearchResult { symbol: string; name: string; exchange: string }

type SortKey = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'pe'
type SortDir = 'asc' | 'desc'

function MiniSparkline({ up }: { up: boolean }) {
  const pts = up
    ? [60, 55, 58, 50, 45, 42, 38, 32, 28, 20]
    : [20, 25, 22, 30, 35, 38, 42, 48, 52, 60]
  const max = Math.max(...pts), min = Math.min(...pts)
  const norm = (v: number) => ((v - min) / (max - min)) * 30
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * 5.5},${30 - norm(p)}`).join(' ')
  return (
    <svg width="50" height="32" viewBox="0 0 50 32" className="opacity-80">
      <path d={path} fill="none" stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `${(n/1e9).toFixed(2)}B`
  return `${(n/1e6).toFixed(0)}M`
}

export default function WatchlistPage() {
  const [items, setItems]               = useState<WatchItem[]>([])
  const [live, setLive]                 = useState<Record<string, number>>({})
  const [search, setSearch]             = useState('')
  const [results, setResults]           = useState<SearchResult[]>([])
  const [searching, setSearching]       = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [sortKey, setSortKey]           = useState<SortKey>('symbol')
  const [sortDir, setSortDir]           = useState<SortDir>('asc')
  const searchRef                       = useRef<HTMLDivElement>(null)

  const { connected, subscribe } = useWebSocket(msg => {
    if (msg.type === 'quotes') {
      const m: Record<string,number> = {}
      msg.data.forEach((q: any) => { m[q.symbol] = q.price })
      setLive(p => ({ ...p, ...m }))
    }
  })

  const load = async () => {
    const r = await api.get('/watchlist')
    setItems(r.data)
    setLoading(false)
    if (r.data.length > 0) subscribe(r.data.map((i: WatchItem) => i.symbol))
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = async (q: string) => {
    setSearch(q)
    if (q.length < 2) { setResults([]); setShowDropdown(false); return }
    setSearching(true); setShowDropdown(true)
    const r = await api.get(`/market/search?q=${encodeURIComponent(q)}`)
    setResults(r.data); setSearching(false)
  }

  const add = async (symbol: string, name: string) => {
    await api.post('/watchlist', { symbol, companyName: name })
    toast.success(`${symbol} ajouté à la watchlist`)
    setSearch(''); setResults([]); setShowDropdown(false)
    load()
  }

  const remove = async (symbol: string) => {
    await api.delete(`/watchlist/${symbol}`)
    toast.success(`${symbol} retiré`)
    setItems(p => p.filter(i => i.symbol !== symbol))
  }

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...items].sort((a, b) => {
    const getVal = (item: WatchItem): number | string => {
      const price = live[item.symbol] ?? item.quote?.price ?? 0
      switch (sortKey) {
        case 'symbol':       return item.symbol
        case 'price':        return price
        case 'changePercent':return item.quote?.changePercent ?? 0
        case 'volume':       return item.quote?.volume ?? 0
        case 'marketCap':    return item.quote?.marketCap ?? 0
        case 'pe':           return item.quote?.pe ?? 0
      }
    }
    const va = getVal(a), vb = getVal(b)
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const totalValue  = items.reduce((s, i) => s + (live[i.symbol] ?? i.quote?.price ?? 0), 0)
  const gainers     = items.filter(i => (i.quote?.changePercent ?? 0) > 0).length
  const losers      = items.filter(i => (i.quote?.changePercent ?? 0) < 0).length

  const COLS: { key: SortKey; label: string; right?: boolean }[] = [
    { key:'symbol',        label:'Titre' },
    { key:'price',         label:'Prix',      right:true },
    { key:'changePercent', label:'Variation', right:true },
    { key:'volume',        label:'Volume',    right:true },
    { key:'marketCap',     label:'Cap.',       right:true },
    { key:'pe',            label:'P/E',        right:true },
  ]

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* ── Header ──────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Eye size={22} className="text-cyan-400"/> Watchlist
          </h1>
          <Badge variant={connected ? 'green' : 'white'} className="mt-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-zinc-500')}/>
            {connected ? 'Prix en direct' : 'Hors ligne'}
          </Badge>
        </div>
      </motion.div>

      {/* ── Stats ───────────────────────────────────── */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Titres suivis', value:items.length,  Icon:Eye,       color:'text-cyan-400',   bg:'bg-cyan-500/10'   },
            { label:'Hausse',        value:gainers,        Icon:TrendingUp, color:'text-green-400',  bg:'bg-green-500/10'  },
            { label:'Baisse',        value:losers,         Icon:TrendingDown,color:'text-red-400',   bg:'bg-red-500/10'    },
          ].map(({ label, value, Icon, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg, color)}>
                    <Icon size={18}/>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">{label}</p>
                    <p className={cn('text-2xl font-black', color)}>{value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Search bar ──────────────────────────────── */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.1 }}>
        <div ref={searchRef} className="relative max-w-lg">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
            <input
              value={search}
              onChange={e => doSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Ajouter un titre — symbole ou nom (ex: AAPL, Tesla...)"
              className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-2xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 hover:border-zinc-700 transition-all"
            />
            {searching && (
              <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin"/>
            )}
          </div>

          <AnimatePresence>
            {showDropdown && results.length > 0 && (
              <motion.div initial={{ opacity:0, y:-8, scale:.97 }} animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-4 }}
                className="absolute z-20 top-full mt-2 w-full bg-zinc-900 border border-white/[.08] rounded-2xl shadow-2xl overflow-hidden">
                {results.map((r, i) => (
                  <motion.button key={r.symbol} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => add(r.symbol, r.name)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[.04] text-left border-b border-white/[.04] last:border-0 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                        {r.symbol[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{r.symbol}</p>
                        <p className="text-zinc-400 text-xs truncate max-w-[220px]">{r.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-xs">{r.exchange}</span>
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                        <Star size={11} className="text-cyan-400"/>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Empty state ─────────────────────────────── */}
      {!loading && items.length === 0 && (
        <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
          className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center mb-5">
            <Eye size={36} className="text-cyan-400 opacity-60"/>
          </div>
          <p className="text-xl font-bold text-white mb-2">Watchlist vide</p>
          <p className="text-zinc-500 text-sm max-w-xs">
            Recherchez un titre ci-dessus pour le suivre. Les prix se mettent à jour en temps réel.
          </p>
        </motion.div>
      )}

      {/* ── Table ───────────────────────────────────── */}
      {items.length > 0 && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15 }}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.05]">
              <p className="font-bold text-white text-sm">
                {sorted.length} titre{sorted.length > 1 ? 's' : ''} suivi{sorted.length > 1 ? 's' : ''}
              </p>
              <p className="text-zinc-600 text-xs">Cliquez sur les en-têtes pour trier</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[.04]">
                    {COLS.map(col => (
                      <th key={col.key} onClick={() => sort(col.key)}
                        className={cn(
                          'px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider',
                          'cursor-pointer hover:text-zinc-300 transition-colors select-none',
                          col.right ? 'text-right' : 'text-left'
                        )}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <span className={cn('text-cyan-400', sortDir === 'desc' ? 'rotate-180 inline-block' : '')}>↑</span>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tendance</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sorted.map((item, i) => {
                      const price  = live[item.symbol] ?? item.quote?.price ?? 0
                      const chg    = item.quote?.changePercent ?? 0
                      const isUp   = chg >= 0
                      const isLive = !!live[item.symbol]

                      return (
                        <motion.tr key={item.id}
                          initial={{ opacity:0, x:-12 }}
                          animate={{ opacity:1, x:0 }}
                          exit={{ opacity:0, height:0 }}
                          transition={{ delay: Math.min(i, 15) * 0.04 }}
                          className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors group">

                          {/* Symbol */}
                          <td className="px-4 py-3">
                            <Link href={`/stock/${item.symbol}`} className="flex items-center gap-3 group/link">
                              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-sm font-black text-white group-hover/link:bg-zinc-700 transition-colors">
                                {item.symbol[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-white group-hover/link:text-cyan-400 transition-colors">{item.symbol}</p>
                                  <ArrowUpRight size={11} className="text-zinc-600 group-hover/link:text-cyan-400 transition-colors"/>
                                  {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>}
                                </div>
                                <p className="text-zinc-500 text-xs truncate max-w-[160px]">{item.companyName}</p>
                              </div>
                            </Link>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 text-right">
                            <motion.p
                              key={price.toFixed(2)}
                              initial={{ scale:1.1, color:'#22c55e' }}
                              animate={{ scale:1, color:'#ffffff' }}
                              transition={{ duration:.4 }}
                              className="font-bold tabular-nums text-white">
                              ${price.toFixed(2)}
                            </motion.p>
                          </td>

                          {/* Change */}
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              'inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full',
                              isUp ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                            )}>
                              {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                              {isUp?'+':''}{chg.toFixed(2)}%
                            </span>
                          </td>

                          {/* Volume */}
                          <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                            {item.quote?.volume ? `${(item.quote.volume/1e6).toFixed(1)}M` : '—'}
                          </td>

                          {/* Market Cap */}
                          <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                            {item.quote?.marketCap ? fmt(item.quote.marketCap) : '—'}
                          </td>

                          {/* PE */}
                          <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">
                            {item.quote?.pe?.toFixed(1) ?? '—'}
                          </td>

                          {/* Sparkline */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <MiniSparkline up={isUp}/>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/stock/${item.symbol}`}
                                className="p-1.5 text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all">
                                <BarChart3 size={14}/>
                              </Link>
                              <button onClick={() => remove(item.symbol)}
                                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[.04] bg-white/[.01]">
                <p className="text-zinc-600 text-xs">
                  {gainers} en hausse · {losers} en baisse
                </p>
                <p className="text-zinc-600 text-xs">
                  Ajouté via la recherche · mise à jour en temps réel
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
