'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, ArrowUpDown, Plus, X, Zap } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import Link from 'next/link'

interface StockResult {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; marketCap?: number
  pe?: number; week52High?: number; week52Low?: number; currency: string
}
interface Filters { minPrice:string; maxPrice:string; minMarketCap:string; maxPE:string; minChangePercent:string; maxChangePercent:string }

const EMPTY: Filters = { minPrice:'', maxPrice:'', minMarketCap:'', maxPE:'', minChangePercent:'', maxChangePercent:'' }

const PRESETS = [
  { label:'🚀 Top gainers',  icon:<TrendingUp  size={12}/>, filters:{ ...EMPTY, minChangePercent:'2' } },
  { label:'📉 Top losers',   icon:<TrendingDown size={12}/>, filters:{ ...EMPTY, maxChangePercent:'-2' } },
  { label:'💎 Value stocks', icon:<Zap size={12}/>,         filters:{ ...EMPTY, maxPE:'15', minMarketCap:'10000000000' } },
  { label:'🏢 Large caps',   icon:<Zap size={12}/>,         filters:{ ...EMPTY, minMarketCap:'100000000000' } },
]

type SortKey = keyof StockResult
type SortDir = 'asc' | 'desc'

function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

export default function ScreenerPage() {
  const [filters, setFilters]     = useState<Filters>(EMPTY)
  const [results, setResults]     = useState<StockResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [ran, setRan]             = useState(false)
  const [sortKey, setSortKey]     = useState<SortKey>('marketCap')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(true)
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())

  const runScreener = async (overrides?: Partial<Filters>) => {
    setLoading(true); setRan(true)
    const f = { ...filters, ...overrides }
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k,v]) => { if (v !== '') params.set(k, v) })
    try {
      const r = await api.get(`/market/screener?${params}`)
      setResults(r.data)
      toast.success(`${r.data.length} résultat${r.data.length>1?'s':''} trouvé${r.data.length>1?'s':''}`)
    } catch { toast.error('Erreur lors de la recherche') }
    setLoading(false)
  }

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...results].sort((a, b) => {
    const va = (a[sortKey] ?? 0) as number
    const vb = (b[sortKey] ?? 0) as number
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const toggleWatchlist = async (s: StockResult) => {
    if (watchlist.has(s.symbol)) {
      await api.delete(`/watchlist/${s.symbol}`)
      setWatchlist(p => { const n = new Set(p); n.delete(s.symbol); return n })
      toast.success(`${s.symbol} retiré`)
    } else {
      await api.post('/watchlist', { symbol: s.symbol, companyName: s.name })
      setWatchlist(p => new Set(p).add(s.symbol))
      toast.success(`${s.symbol} ajouté à la watchlist`)
    }
  }

  const COLS: { key: SortKey; label: string; right?: boolean }[] = [
    { key:'symbol',        label:'Titre' },
    { key:'price',         label:'Prix',      right:true },
    { key:'changePercent', label:'Variation', right:true },
    { key:'volume',        label:'Volume',    right:true },
    { key:'marketCap',     label:'Cap.',       right:true },
    { key:'pe',            label:'P/E',        right:true },
    { key:'week52High',    label:'52s haut',   right:true },
    { key:'week52Low',     label:'52s bas',    right:true },
  ]

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Search size={22} className="text-purple-500"/> Screener
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Filtrez les meilleures opportunités de marché</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<SlidersHorizontal size={13}/>}
          onClick={() => setShowFilters(p=>!p)}>
          Filtres {activeFilterCount > 0 && <Badge variant="blue" size="sm" className="ml-1">{activeFilterCount}</Badge>}
        </Button>
      </motion.div>

      {/* Presets */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <motion.button key={p.label} whileHover={{ y:-2 }} whileTap={{ scale:.97 }}
            onClick={() => { setFilters(p.filters); runScreener(p.filters) }}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all shadow-sm">
            {p.icon} {p.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }} transition={{ duration:.25 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-900 text-sm">Filtres personnalisés</p>
                {activeFilterCount > 0 && (
                  <button onClick={() => setFilters(EMPTY)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                    <X size={12}/> Réinitialiser
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key:'minPrice',         label:'Prix min ($)' },
                  { key:'maxPrice',         label:'Prix max ($)' },
                  { key:'minMarketCap',     label:'Cap. min ($)' },
                  { key:'maxPE',            label:'P/E max' },
                  { key:'minChangePercent', label:'Variation min (%)' },
                  { key:'maxChangePercent', label:'Variation max (%)' },
                ].map(({ key, label }) => (
                  <Input key={key} label={label} type="number"
                    value={filters[key as keyof Filters]}
                    onChange={e => setFilters(p => ({...p, [key]: e.target.value}))}
                    placeholder="—"/>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="brand" onClick={() => runScreener()} loading={loading} leftIcon={<Search size={14}/>}>
                  Lancer le screener
                </Button>
                <Button variant="ghost" onClick={() => { setFilters(EMPTY); setResults([]); setRan(false) }}>
                  Effacer
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {ran && (
          <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-sm">
                  {loading ? 'Recherche...' : `${sorted.length} résultat${sorted.length>1?'s':''}`}
                </p>
                <p className="text-gray-400 text-xs">Cliquez sur une colonne pour trier</p>
              </div>

              {sorted.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Search size={36} className="mb-3 opacity-30"/>
                  <p className="font-medium text-gray-500">Aucune action ne correspond à ces critères.</p>
                  <p className="text-xs mt-1 text-gray-400">Essayez de modifier vos filtres.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {COLS.map(col => (
                          <th key={col.key} onClick={() => sort(col.key)}
                            className={cn('px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors',
                              col.right ? 'text-right' : 'text-left')}>
                            <span className="inline-flex items-center gap-1">
                              {col.right && sortKey===col.key && <ArrowUpDown size={10} className={sortDir==='asc'?'rotate-180':''}/>}
                              {col.label}
                              {!col.right && sortKey===col.key && <ArrowUpDown size={10} className={sortDir==='asc'?'rotate-180':''}/>}
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3"/>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {sorted.map((s, i) => (
                          <motion.tr key={s.symbol}
                            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                            transition={{ delay: Math.min(i,10)*0.03 }}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/stock/${s.symbol}`} className="flex items-center gap-2.5 group">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                  {s.symbol[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{s.symbol}</p>
                                  <p className="text-gray-400 text-xs truncate max-w-[140px]">{s.name}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">${s.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums text-xs px-2 py-0.5 rounded-full',
                                s.changePercent>=0?'text-green-700 bg-green-100':'text-red-600 bg-red-100')}>
                                {s.changePercent>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
                                {s.changePercent>=0?'+':''}{s.changePercent.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{(s.volume/1e6).toFixed(1)}M</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{fmt(s.marketCap)}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{s.pe?.toFixed(1)??'—'}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{s.week52High?`$${s.week52High.toFixed(2)}`:'—'}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">{s.week52Low?`$${s.week52Low.toFixed(2)}`:'—'}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => toggleWatchlist(s)}
                                className={cn('p-1.5 rounded-lg transition-all',
                                  watchlist.has(s.symbol)
                                    ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                                    : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50')}>
                                <Plus size={13} className={watchlist.has(s.symbol)?'rotate-45':''}/>
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!ran && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <Search size={28} className="text-purple-400"/>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Prêt à screener</p>
          <p className="text-sm text-gray-400">Choisissez un preset ou configurez vos filtres puis lancez la recherche.</p>
        </motion.div>
      )}
    </div>
  )
}
