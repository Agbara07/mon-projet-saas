'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Globe, TrendingUp, TrendingDown, BarChart3, MapPin,
  Building2, RefreshCw, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'

/* ── Types ──────────────────────────────────────────────── */
interface BRVMQuote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; marketCap?: number
  sector: string; country: string; currency: string
}
interface BRVMIndex {
  name: string; value: number; change: number; changePercent: number; date: string
}
interface BRVMSector {
  sector: string; stockCount: number; marketCap: number
  advancers: number; decliners: number; unchanged: number; avgChange: number
}
interface BRVMCountry {
  country: string; stockCount: number; marketCap: number
}
interface BRVMMarket {
  indices: BRVMIndex[]; totalMarketCap: number; totalVolume: number
  advancers: number; decliners: number; unchanged: number
  topGainers: BRVMQuote[]; topLosers: BRVMQuote[]
  sectors: BRVMSector[]; date: string
}

/* ── Helpers ────────────────────────────────────────────── */
function fmtXOF(n?: number) {
  if (n == null) return '—'
  if (n >= 1e12) return `${(n/1e12).toFixed(2)} T XOF`
  if (n >= 1e9)  return `${(n/1e9).toFixed(2)} Md XOF`
  if (n >= 1e6)  return `${(n/1e6).toFixed(2)} M XOF`
  return `${n.toLocaleString('fr-FR')} XOF`
}
function fmtPrice(n: number) {
  return n > 0 ? `${n.toLocaleString('fr-FR')} XOF` : '—'
}
function fmtVol(n: number) {
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`
  return n.toString()
}

const COUNTRY_FLAGS: Record<string, string> = {
  'Côte d\'Ivoire': '🇨🇮', 'Sénégal': '🇸🇳', 'Burkina Faso': '🇧🇫',
  'Bénin': '🇧🇯', 'Mali': '🇲🇱', 'Niger': '🇳🇪', 'Togo': '🇹🇬', 'Guinée-Bissau': '🇬🇼',
}
const SECTOR_COLORS: Record<string, string> = {
  'Agriculture':  'bg-green-100 text-green-700',
  'Banque':       'bg-blue-100 text-blue-700',
  'Télécoms':     'bg-purple-100 text-purple-700',
  'Industrie':    'bg-orange-100 text-orange-700',
  'Distribution': 'bg-yellow-100 text-yellow-700',
  'Energie':      'bg-red-100 text-red-700',
  'Logistique':   'bg-gray-100 text-gray-700',
  'Automobile':   'bg-indigo-100 text-indigo-700',
  'Transport':    'bg-teal-100 text-teal-700',
}

type Tab = 'overview' | 'quotes' | 'sectors' | 'countries'

/* ── Page BRVM ──────────────────────────────────────────── */
export default function BRVMPage() {
  const [tab, setTab]         = useState<Tab>('overview')
  const [market, setMarket]   = useState<BRVMMarket | null>(null)
  const [quotes, setQuotes]   = useState<BRVMQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<keyof BRVMQuote>('marketCap')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [filterSector, setFilterSector] = useState('')
  const [filterCountry, setFilterCountry] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mkt, qts] = await Promise.all([
        api.get('/market/brvm/market'),
        api.get('/market/brvm'),
      ])
      setMarket(mkt.data)
      setQuotes(qts.data)
    } catch {
      toast.error('Impossible de charger les données BRVM')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sectors  = Array.from(new Set(quotes.map(q => q.sector))).sort()
  const countries = Array.from(new Set(quotes.map(q => q.country))).sort()

  const filtered = quotes
    .filter(q => {
      const s = search.toLowerCase()
      if (s && !q.symbol.toLowerCase().includes(s) && !q.name.toLowerCase().includes(s)) return false
      if (filterSector  && q.sector  !== filterSector)  return false
      if (filterCountry && q.country !== filterCountry) return false
      return true
    })
    .sort((a, b) => {
      const av = (a[sortKey] as any) ?? 0
      const bv = (b[sortKey] as any) ?? 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const handleSort = (key: keyof BRVMQuote) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const TABS: { key: Tab; label: string; Icon: any }[] = [
    { key: 'overview',  label: 'Vue marché',    Icon: BarChart3  },
    { key: 'quotes',    label: 'Cotations',     Icon: TrendingUp },
    { key: 'sectors',   label: 'Secteurs',      Icon: Building2  },
    { key: 'countries', label: 'Pays UEMOA',    Icon: MapPin     },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Globe size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">BRVM</h1>
            <p className="text-sm text-gray-500">Bourse Régionale des Valeurs Mobilières — UEMOA</p>
          </div>
          <div className="flex gap-1 ml-4">
            {['🇨🇮','🇸🇳','🇧🇫','🇧🇯','🇲🇱','🇳🇪','🇹🇬','🇬🇼'].map(f => (
              <span key={f} className="text-xl">{f}</span>
            ))}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')}/>
          Actualiser
        </button>
      </div>

      {/* KPIs rapides */}
      {market && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:'Capitalisation totale', value: fmtXOF(market.totalMarketCap), sub: `${quotes.filter(q=>q.price>0).length} sociétés cotées` },
            { label:'Haussiers / Baissiers', value: `${market.advancers} / ${market.decliners}`, sub: `${market.unchanged} inchangés` },
            { label:'Volume total', value: fmtVol(market.totalVolume), sub: 'Titres échangés' },
            { label:'Date séance', value: market.date, sub: 'Données fin de journée' },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-lg font-black text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Indices */}
      {market?.indices && (
        <div className="grid grid-cols-2 gap-4">
          {market.indices.map(idx => (
            <Card key={idx.name} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">{idx.name}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {idx.value.toFixed(2).replace('.',',')}
                  </p>
                </div>
                <div className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold',
                  idx.changePercent >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {idx.changePercent >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </div>
              </div>
              <div className={cn(
                'mt-2 h-1 rounded-full',
                idx.changePercent >= 0 ? 'bg-green-200' : 'bg-red-200'
              )}>
                <div
                  className={cn('h-full rounded-full', idx.changePercent >= 0 ? 'bg-green-500' : 'bg-red-500')}
                  style={{ width: `${Math.min(Math.abs(idx.changePercent) * 10, 100)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <Icon size={14}/>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Vue marché ── */}
      {tab === 'overview' && market && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Top gainers */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-green-600"/>
                <h3 className="font-bold text-gray-900">Top Hausses</h3>
              </div>
              <div className="space-y-3">
                {market.topGainers.map(q => (
                  <div key={q.symbol} className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 text-sm">{q.symbol}</span>
                      <span className="text-xs text-gray-400 ml-2 truncate max-w-32 inline-block">{q.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmtPrice(q.price)}</p>
                      <p className="text-xs font-bold text-green-600">+{q.changePercent.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top losers */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={16} className="text-red-600"/>
                <h3 className="font-bold text-gray-900">Top Baisses</h3>
              </div>
              <div className="space-y-3">
                {market.topLosers.map(q => (
                  <div key={q.symbol} className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 text-sm">{q.symbol}</span>
                      <span className="text-xs text-gray-400 ml-2 truncate max-w-32 inline-block">{q.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmtPrice(q.price)}</p>
                      <p className="text-xs font-bold text-red-600">{q.changePercent.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Répartition haussiers/baissiers */}
          <Card className="p-5">
            <h3 className="font-bold text-gray-900 mb-4">Breadth du marché</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 rounded-full overflow-hidden bg-gray-100 flex">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(market.advancers / (market.advancers + market.decliners + market.unchanged || 1)) * 100}%` }}
                />
                <div
                  className="bg-gray-300 h-full transition-all"
                  style={{ width: `${(market.unchanged / (market.advancers + market.decliners + market.unchanged || 1)) * 100}%` }}
                />
                <div
                  className="bg-red-400 h-full transition-all"
                  style={{ width: `${(market.decliners / (market.advancers + market.decliners + market.unchanged || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-6 mt-3 text-sm">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/><span className="font-bold text-green-700">{market.advancers}</span> <span className="text-gray-500">hausses</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"/><span className="font-bold text-gray-700">{market.unchanged}</span> <span className="text-gray-500">stables</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/><span className="font-bold text-red-700">{market.decliners}</span> <span className="text-gray-500">baisses</span></span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Tab: Cotations ── */}
      {tab === 'quotes' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un titre..."
                className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
            <select
              value={filterSector} onChange={e => setFilterSector(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les secteurs</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les pays</option>
              {countries.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c] ?? ''} {c}</option>)}
            </select>
            <span className="text-sm text-gray-400 self-center">{filtered.length} titre{filtered.length>1?'s':''}</span>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {([
                      ['symbol','Symbole'],['name','Société'],['price','Cours (XOF)'],
                      ['changePercent','Variation'],['volume','Volume'],
                      ['marketCap','Capitalisation'],['sector','Secteur'],['country','Pays'],
                    ] as [keyof BRVMQuote, string][]).map(([key, label]) => (
                      <th key={key}
                        onClick={() => handleSort(key)}
                        className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap select-none">
                        <span className="flex items-center gap-1">
                          {label}
                          {sortKey === key ? (
                            sortDir === 'desc' ? <ChevronDown size={12}/> : <ChevronUp size={12}/>
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({length: 8}).map((_,i) => (
                      <tr key={i}>
                        {Array.from({length:8}).map((_,j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" style={{width:`${60+Math.random()*40}%`}}/>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        Aucun titre trouvé
                      </td>
                    </tr>
                  ) : filtered.map(q => (
                    <tr key={q.symbol} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-blue-700">{q.symbol}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-48 truncate">{q.name}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {q.price > 0 ? q.price.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className={cn('px-4 py-3 font-bold',
                        q.changePercent > 0 ? 'text-green-600' : q.changePercent < 0 ? 'text-red-600' : 'text-gray-400'
                      )}>
                        {q.changePercent > 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtVol(q.volume)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtXOF(q.marketCap)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', SECTOR_COLORS[q.sector] ?? 'bg-gray-100 text-gray-600')}>
                          {q.sector}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {COUNTRY_FLAGS[q.country] ?? ''} {q.country}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Tab: Secteurs ── */}
      {tab === 'sectors' && market && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {market.sectors.map(s => (
              <Card key={s.sector} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={cn('px-2.5 py-1 rounded-xl text-xs font-bold', SECTOR_COLORS[s.sector] ?? 'bg-gray-100 text-gray-600')}>
                      {s.sector}
                    </span>
                    <p className="text-xs text-gray-400 mt-1.5">{s.stockCount} société{s.stockCount>1?'s':''}</p>
                  </div>
                  <span className={cn('text-sm font-bold',
                    s.avgChange > 0 ? 'text-green-600' : s.avgChange < 0 ? 'text-red-600' : 'text-gray-400'
                  )}>
                    {s.avgChange > 0 ? '+' : ''}{s.avgChange.toFixed(2)}%
                  </span>
                </div>
                <p className="text-lg font-black text-gray-900">{fmtXOF(s.marketCap)}</p>
                <div className="mt-3 flex gap-3 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">▲ {s.advancers}</span>
                  <span className="text-gray-400">— {s.unchanged}</span>
                  <span className="text-red-600 font-medium">▼ {s.decliners}</span>
                </div>
                {/* Barre de performance */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', s.avgChange >= 0 ? 'bg-green-400' : 'bg-red-400')}
                    style={{ width: `${Math.min(Math.abs(s.avgChange) * 20, 100)}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Tab: Pays ── */}
      {tab === 'countries' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { country:"Côte d'Ivoire", desc:'Première économie de la zone' },
              { country:'Sénégal',       desc:'Hub financier régional' },
              { country:'Burkina Faso',  desc:'Secteur minier et télécom' },
              { country:'Bénin',         desc:'Logistique et commerce' },
              { country:'Mali',          desc:'Secteur bancaire' },
              { country:'Niger',         desc:'Ressources naturelles' },
              { country:'Togo',          desc:'Banque et logistique' },
              { country:'Guinée-Bissau', desc:'Économie émergente' },
            ].map(({ country, desc }) => {
              const qs = quotes.filter(q => q.country === country)
              const mktCap = qs.reduce((s,q) => s + (q.marketCap ?? 0), 0)
              return (
                <Card key={country} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{COUNTRY_FLAGS[country] ?? '🌍'}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{country}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-blue-700">{qs.length}</p>
                  <p className="text-xs text-gray-400 mb-1">société{qs.length>1?'s':''} cotée{qs.length>1?'s':''}</p>
                  <p className="text-xs font-semibold text-gray-600">{fmtXOF(mktCap)}</p>
                  {qs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {qs.slice(0,4).map(q => (
                        <span key={q.symbol} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-mono rounded">
                          {q.symbol}
                        </span>
                      ))}
                      {qs.length > 4 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">+{qs.length-4}</span>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Info UEMOA */}
          <Card className="p-6 mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
            <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
              <Globe size={16} className="text-green-600"/>
              À propos de la BRVM
            </h3>
            <p className="text-sm text-green-700 leading-relaxed">
              La Bourse Régionale des Valeurs Mobilières (BRVM) est la bourse commune aux 8 États membres de
              l'Union Économique et Monétaire Ouest-Africaine (UEMOA). Fondée en 1998, elle a son siège à
              Abidjan (Côte d'Ivoire). La devise officielle est le franc CFA (XOF), avec une parité fixe face à l'euro.
              Les séances se tiennent du lundi au vendredi de 9h à 15h30 (heure locale).
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
