'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDebounceValue } from 'usehooks-ts'
import {
  Globe, TrendingUp, TrendingDown, BarChart3, MapPin,
  Building2, RefreshCw, ChevronDown, ChevronUp, Search,
  Droplets, DollarSign, Wheat, Activity,
  Shield, Calculator, Info, AlertTriangle, CheckCircle, Radio,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ScoreGauge, GovernanceGauge, KPICounter,
  DividendBarChart, DividendBarChartFull,
  AfricaRadarChart, SectorPieChart, CorrelationHeatmap,
} from '@/components/brvm/BRVMCharts'

/* ── Types ──────────────────────────────────────────────── */
interface BRVMQuote     { symbol:string; name:string; price:number; change:number; changePercent:number; volume:number; marketCap?:number; sector:string; country:string; currency:string }
interface BRVMIndex     { name:string; value:number; change:number; changePercent:number; date:string }
interface BRVMSector    { sector:string; stockCount:number; marketCap:number; advancers:number; decliners:number; unchanged:number; avgChange:number }
interface BRVMMarket    { indices:BRVMIndex[]; totalMarketCap:number; totalVolume:number; advancers:number; decliners:number; unchanged:number; topGainers:BRVMQuote[]; topLosers:BRVMQuote[]; sectors:BRVMSector[]; date:string }
interface LiquidityScore{ symbol:string; name:string; amihudRatio:number; tradingFreq:number; avgVolume30d:number; dtlEstimateDays:number; liquidityScore:number; category:string; sector:string; isInBRVM10:boolean }
interface DividendData  { symbol:string; name:string; currentPrice:number; lastDividend:number; currentYield:number; payoutRatio?:number; history:{year:number;amount:number;yield?:number}[]; consistency:number; exDividendDate?:string; gordonFairValue?:number; sector:string; country:string; qualified:boolean }
interface CommodityCorr { symbol:string; name:string; primaryCommodity:string; correlation90d:number; correlation30d:number; divergence:number; signal:string; confidence:string; interpretation:string }
interface AfricanMarket { market:string; country:string; indexName:string; currency:string; peRatio?:number; dividendYield?:number; ytdReturn?:number; marketCapUSD?:number; volatility?:string; mainSectors:string[]; description:string; source:string }
interface MacroIndicator{ name:string; value:number; unit:string; previousYear:number; trend:string; impact:string; description:string; source:string }
interface MacroDashboard{ lastUpdated:string; bceaoRate:number; inflation:number; gdpGrowth:number; indicators:MacroIndicator[]; commodityLinks:{commodity:string;price:string;relevance:string}[]; risks:{label:string;level:string;description:string}[] }
interface GovernanceScore{ symbol:string; name:string; totalScore:number; auditScore:number; transparencyScore:number; dividendScore:number; parentScore:number; auditor?:string; parentCompany?:string; floatPct?:number; riskLevel:string; strengths:string[]; warnings:string[] }

/* ── Helpers ────────────────────────────────────────────── */
const fmtXOF = (n?:number) => {
  if (n==null) return '—'
  if (n>=1e12) return `${(n/1e12).toFixed(2)} T`
  if (n>=1e9)  return `${(n/1e9).toFixed(2)} Md`
  if (n>=1e6)  return `${(n/1e6).toFixed(1)} M`
  return n.toLocaleString('fr-FR')
}
const fmtVol = (n:number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(0)}K`:String(n)

const COUNTRY_FLAGS: Record<string,string> = {
  "Côte d'Ivoire":'🇨🇮', 'Sénégal':'🇸🇳', 'Burkina Faso':'🇧🇫',
  'Bénin':'🇧🇯', 'Mali':'🇲🇱', 'Niger':'🇳🇪', 'Togo':'🇹🇬', 'Guinée-Bissau':'🇬🇼',
}

// Sector pills — CSS variables, dark/light compatible
const SECTOR_PILL: Record<string,string> = {
  Agriculture:   'bg-[var(--fin-green-bg)]  text-[var(--fin-green)]',
  Banque:        'bg-[var(--fin-blue-bg)]   text-[var(--fin-blue)]',
  Télécoms:      'bg-[var(--fin-blue-bg)]   text-[var(--fin-cyan)]',
  Industrie:     'bg-[var(--fin-amber-bg)]  text-[var(--fin-amber)]',
  Distribution:  'bg-[var(--fin-amber-bg)]  text-[var(--fin-amber)]',
  Energie:       'bg-[var(--fin-red-bg)]    text-[var(--fin-red)]',
  Logistique:    'bg-[var(--fin-surface)]   text-[var(--fin-t2)]',
  Automobile:    'bg-[var(--fin-blue-bg)]   text-[var(--fin-blue)]',
  Transport:     'bg-[var(--fin-blue-bg)]   text-[var(--fin-cyan)]',
}
const sectorPill = (s:string) => SECTOR_PILL[s] ?? 'bg-[var(--fin-surface)] text-[var(--fin-t2)]'

const corrColor = (r:number) =>
  r>=0.6?'text-[var(--fin-green)]':r>=0.3?'text-[var(--fin-amber)]':r<=-0.3?'text-[var(--fin-blue)]':'text-[var(--fin-t3)]'

/* ── Info banner Bloomberg ──────────────────────────────── */
function InfoBanner({ color, title, text, source }: { color: string; title:string; text:string; source:string }) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 border-b border-[var(--fin-border)]',
      'bg-[var(--fin-surface)]'
    )}>
      <Info size={11} strokeWidth={1.5} className={cn('mt-0.5 flex-shrink-0', color)}/>
      <div>
        <p className={cn('text-[10px] font-bold uppercase tracking-wider', color)}>{title}</p>
        <p className="text-[10px] text-[var(--fin-t2)] mt-0.5 leading-relaxed">{text}</p>
        <p className={cn('text-[9px] mt-1 font-mono', color, 'opacity-70')}>{source}</p>
      </div>
    </div>
  )
}

/* ── Skeleton row ────────────────────────────────────────── */
function SkeletonRow({ cols=4 }:{cols?:number}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--fin-border)]" aria-hidden="true">
      {Array.from({length:cols}).map((_,i) => (
        <div key={i} className="flex-1 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" style={{opacity:1-i*0.15}}/>
      ))}
    </div>
  )
}

/* ── Tabs ───────────────────────────────────────────────── */
type Tab = 'overview'|'quotes'|'sectors'|'countries'|'liquidity'|'dividends'|'commodities'|'africa'|'macro'|'governance'|'cost'

const TAB_GROUPS = [
  { label:'Marché', tabs:[
    { key:'overview'   as Tab, label:'Vue marché', Icon:BarChart3  },
    { key:'quotes'     as Tab, label:'Cotations',  Icon:TrendingUp },
    { key:'sectors'    as Tab, label:'Secteurs',   Icon:Building2  },
    { key:'countries'  as Tab, label:'Pays UEMOA', Icon:MapPin     },
  ]},
  { label:'Analyse', tabs:[
    { key:'liquidity'  as Tab, label:'Liquidité',  Icon:Droplets   },
    { key:'dividends'  as Tab, label:'Dividendes', Icon:DollarSign },
    { key:'commodities'as Tab, label:'Commodités', Icon:Wheat      },
    { key:'governance' as Tab, label:'Gouvernance',Icon:Shield     },
  ]},
  { label:'Macro & Outils', tabs:[
    { key:'africa'     as Tab, label:'Afrique',    Icon:Globe      },
    { key:'macro'      as Tab, label:'Macro UEMOA',Icon:Activity   },
    { key:'cost'       as Tab, label:'Simulateur', Icon:Calculator },
  ]},
]

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function BRVMPage() {
  const [tab, setTab]         = useState<Tab>('overview')
  const [market, setMarket]   = useState<BRVMMarket|null>(null)
  const [quotes, setQuotes]   = useState<BRVMQuote[]>([])
  const [liquidity, setLiquid]= useState<LiquidityScore[]>([])
  const [dividends, setDivs]  = useState<DividendData[]>([])
  const [commodities, setComm]= useState<CommodityCorr[]>([])
  const [africa, setAfrica]   = useState<AfricanMarket[]>([])
  const [macro, setMacro]     = useState<MacroDashboard|null>(null)
  const [governance, setGov]  = useState<GovernanceScore[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('marketCap')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [filterSector, setFilterSector] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [costForm, setCostForm] = useState({ amount:'1000000', type:'buy', country:'CI', includeTax:false, dividendAmount:'' })
  const [costResult, setCostResult] = useState<any>(null)
  const [cacheStatus, setCacheStatus] = useState<any>(null)

  const loadCore = useCallback(async () => {
    setLoading(true)
    try {
      const [mkt, qts, cs] = await Promise.allSettled([
        api.get('/market/brvm/market'),
        api.get('/market/brvm'),
        api.get('/market/brvm/cache-status'),
      ])
      if (mkt.status==='fulfilled') setMarket(mkt.value.data)
      if (qts.status==='fulfilled') setQuotes(qts.value.data)
      if (cs.status==='fulfilled')  setCacheStatus(cs.value.data)
    } catch { toast.error('Données BRVM non disponibles') }
    finally { setLoading(false) }
  }, [])

  const loadTab = useCallback(async (t: Tab) => {
    setLoadingTab(true)
    try {
      if (t==='liquidity'   && !liquidity.length)   { const r=await api.get('/market/brvm/tools/liquidity');   setLiquid(r.data) }
      if (t==='dividends'   && !dividends.length)   { const r=await api.get('/market/brvm/tools/dividends');   setDivs(r.data) }
      if (t==='commodities' && !commodities.length) { const r=await api.get('/market/brvm/tools/commodities'); setComm(r.data) }
      if (t==='africa'      && !africa.length)      { const r=await api.get('/market/brvm/tools/africa');      setAfrica(r.data) }
      if (t==='macro'       && !macro)               { const r=await api.get('/market/brvm/tools/macro');       setMacro(r.data) }
      if (t==='governance'  && !governance.length)  { const r=await api.get('/market/brvm/tools/governance');  setGov(r.data) }
    } catch { toast.error('Erreur de chargement') }
    finally { setLoadingTab(false) }
  }, [liquidity.length, dividends.length, commodities.length, africa.length, macro, governance.length])

  useEffect(() => { loadCore() }, [loadCore])
  useEffect(() => { loadTab(tab) }, [tab, loadTab])

  const [debouncedSearch] = useDebounceValue(search, 250)
  const tableParentRef    = useRef<HTMLDivElement>(null)

  const sectors   = Array.from(new Set(quotes.map(q=>q.sector))).sort()
  const countries = Array.from(new Set(quotes.map(q=>q.country))).sort()
  const filtered  = quotes.filter(q => {
    const s = debouncedSearch.toLowerCase()
    if (s && !q.symbol.toLowerCase().includes(s) && !q.name.toLowerCase().includes(s)) return false
    if (filterSector  && q.sector  !== filterSector)  return false
    if (filterCountry && q.country !== filterCountry) return false
    return true
  }).sort((a,b) => {
    const av=(a as any)[sortKey]??0, bv=(b as any)[sortKey]??0
    return sortDir==='asc'?(av>bv?1:-1):(av<bv?1:-1)
  })

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  const handleSort = (k:string) => { if(k===sortKey) setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortKey(k);setSortDir('desc')} }

  const runCostSimulator = async () => {
    try {
      const r = await api.post('/market/brvm/tools/cost', {
        amount: +costForm.amount, type: costForm.type, country: costForm.country,
        includeTax: costForm.includeTax,
        dividendAmount: costForm.dividendAmount ? +costForm.dividendAmount : undefined,
      })
      setCostResult(r.data)
    } catch { toast.error('Erreur simulation') }
  }

  const TH = ({ col, label, right }: { col:string; label:string; right?:boolean }) => (
    <th onClick={() => handleSort(col)}
      className={cn(
        'px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap',
        'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] transition-colors',
        sortKey===col && 'text-[var(--fin-blue)]',
        right ? 'text-right' : 'text-left'
      )}>
      {label}{sortKey===col ? (sortDir==='desc'?' ↓':' ↑') : ''}
    </th>
  )

  const isDataFresh = cacheStatus?.isFresh
  const dataSource  = cacheStatus?.source

  return (
    <div className="flex flex-col h-full">

      {/* ── Status bar ── */}
      <div className={cn('flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
        <Globe size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]" aria-hidden="true"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">BRVM</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <span className="text-[9px] font-mono text-[var(--fin-t3)]">UEMOA · XOF · 8 pays</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <div className="flex items-center gap-1.5">
          <Radio size={9} strokeWidth={1.5} className={isDataFresh?'text-[var(--fin-green)]':'text-[var(--fin-amber)]'}/>
          <span className={cn('text-[9px] font-mono', isDataFresh?'text-[var(--fin-green)]':'text-[var(--fin-amber)]')}>
            {isDataFresh ? `${dataSource?.toUpperCase() ?? 'LIVE'}` : 'DONNÉES STATIQUES'}
          </span>
        </div>
        {market && (
          <>
            <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
            <span className="text-[9px] font-mono text-[var(--fin-t3)]">
              <span className="text-[var(--fin-green)] font-bold">▲{market.advancers}</span>
              {' / '}
              <span className="text-[var(--fin-red)] font-bold">▼{market.decliners}</span>
              {' / '}
              <span className="text-[var(--fin-t3)]">—{market.unchanged}</span>
            </span>
          </>
        )}
        <div className="flex-1"/>
        {market && (
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            <span className="text-[var(--fin-t2)]">CAP </span>
            <span className="text-[var(--fin-t1)] font-bold">{fmtXOF(market.totalMarketCap)} XOF</span>
          </span>
        )}
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <button
          onClick={loadCore}
          disabled={loading}
          aria-label="Rafraîchir les données BRVM"
          className="w-7 h-7 rounded flex items-center justify-center text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} strokeWidth={1.5} className={cn(loading && 'animate-spin')}/>
        </button>
      </div>

      {/* ── Indices strip — BRVM Composite + BRVM 10 ── */}
      {market?.indices && (
        <div className={cn('flex items-stretch border-b border-[var(--fin-border)] overflow-x-auto flex-shrink-0','bg-[var(--fin-panel)]')}>
          {market.indices.map(idx => {
            const up = idx.changePercent >= 0
            return (
              <div key={idx.name}
                className={cn(
                  'flex flex-col items-start px-4 py-2 flex-shrink-0',
                  'border-r border-[var(--fin-border)]',
                )}>
                <span className="text-[8px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.12em]">{idx.name}</span>
                <span className="text-sm font-bold text-[var(--fin-t1)] font-mono mt-0.5 tabular-nums">
                  {idx.value.toFixed(2)}
                </span>
                <span className={cn('text-[10px] font-bold font-mono flex items-center gap-0.5', up?'text-[var(--fin-green)]':'text-[var(--fin-red)]')}>
                  {up?'▲':'▼'}{Math.abs(idx.changePercent).toFixed(2)}%
                </span>
              </div>
            )
          })}
          {/* KPIs complémentaires */}
          {market && [
            { label:'VOLUME', value:fmtVol(market.totalVolume), sub:'Titres échangés' },
            { label:'SÉANCE', value:market.date, sub:'Données fin de journée' },
          ].map(k => (
            <div key={k.label} className="flex flex-col items-start px-4 py-2 flex-shrink-0 border-r border-[var(--fin-border)]">
              <span className="text-[8px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.12em]">{k.label}</span>
              <span className="text-sm font-bold text-[var(--fin-t1)] font-mono mt-0.5">{k.value}</span>
              <span className="text-[9px] text-[var(--fin-t3)] font-mono">{k.sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div
        className={cn('flex items-stretch border-b border-[var(--fin-border)] overflow-x-auto flex-shrink-0', 'bg-[var(--fin-panel)]')}
        role="tablist"
        aria-label="Sections BRVM"
      >
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-stretch">
            {gi > 0 && <div className="w-px bg-[var(--fin-border)] self-stretch mx-1"/>}
            <span className="text-[8px] font-bold text-[var(--fin-t3)] uppercase tracking-widest self-center px-2 flex-shrink-0">
              {group.label}
            </span>
            {group.tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-full text-[10px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0',
                  tab === key
                    ? 'border-[var(--fin-blue)] text-[var(--fin-blue)] bg-[var(--fin-active)]'
                    : 'border-transparent text-[var(--fin-t3)] hover:text-[var(--fin-t2)] hover:bg-[var(--fin-hover)]'
                )}
                style={{ paddingTop: 8, paddingBottom: 8 }}
              >
                <Icon size={11} strokeWidth={1.5} aria-hidden="true"/>
                {label}
                {loadingTab && tab === key && <RefreshCw size={8} className="animate-spin ml-0.5"/>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto" role="tabpanel" aria-label={tab}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.15}} className="h-full">

            {/* ═══ VUE MARCHÉ ═══════════════════════════════ */}
            {tab==='overview' && market && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Top Hausses */}
                  <div className={cn('rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
                    <div className={cn('flex items-center gap-2 px-3 py-1.5 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                      <TrendingUp size={10} strokeWidth={1.5} className="text-[var(--fin-green)]"/>
                      <span className="text-[9px] font-bold text-[var(--fin-green)] uppercase tracking-widest">Top Hausses</span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {market.topGainers.map(q => (
                          <tr key={q.symbol} className="border-b border-[var(--fin-border)] last:border-0 hover:bg-[var(--fin-hover)] transition-colors">
                            <td className="px-3 py-1.5 font-mono font-bold text-xs text-[var(--fin-t1)] w-16">{q.symbol}</td>
                            <td className="px-3 py-1.5 text-[9px] text-[var(--fin-t3)] truncate max-w-[100px]">{q.name}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs font-bold text-[var(--fin-t1)] tabular-nums">{q.price>0?q.price.toLocaleString('fr-FR'):'—'}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-[10px] font-bold text-[var(--fin-green)] tabular-nums">+{q.changePercent.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Top Baisses */}
                  <div className={cn('rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
                    <div className={cn('flex items-center gap-2 px-3 py-1.5 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                      <TrendingDown size={10} strokeWidth={1.5} className="text-[var(--fin-red)]"/>
                      <span className="text-[9px] font-bold text-[var(--fin-red)] uppercase tracking-widest">Top Baisses</span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {market.topLosers.map(q => (
                          <tr key={q.symbol} className="border-b border-[var(--fin-border)] last:border-0 hover:bg-[var(--fin-hover)] transition-colors">
                            <td className="px-3 py-1.5 font-mono font-bold text-xs text-[var(--fin-t1)] w-16">{q.symbol}</td>
                            <td className="px-3 py-1.5 text-[9px] text-[var(--fin-t3)] truncate max-w-[100px]">{q.name}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs font-bold text-[var(--fin-t1)] tabular-nums">{q.price>0?q.price.toLocaleString('fr-FR'):'—'}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-[10px] font-bold text-[var(--fin-red)] tabular-nums">{q.changePercent.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Market breadth */}
                <div className={cn('rounded-lg border border-[var(--fin-border)] p-4','bg-[var(--fin-panel)]')}>
                  <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-2">Breadth du marché BRVM</p>
                  <div className="flex h-3 rounded-sm overflow-hidden gap-px">
                    <div className="bg-[var(--fin-green)] h-full transition-all" style={{width:`${market.advancers/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                    <div className="bg-[var(--fin-border-2)] h-full transition-all" style={{width:`${market.unchanged/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                    <div className="bg-[var(--fin-red)] h-full transition-all" style={{width:`${market.decliners/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                  </div>
                  <div className="flex gap-5 mt-2 text-[10px] font-mono">
                    <span className="text-[var(--fin-green)] font-bold">▲{market.advancers} hausses</span>
                    <span className="text-[var(--fin-t3)]">—{market.unchanged} stables</span>
                    <span className="text-[var(--fin-red)] font-bold">▼{market.decliners} baisses</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ COTATIONS ════════════════════════════════ */}
            {tab==='quotes' && (
              <div className="flex flex-col h-full">
                {/* Filter bar */}
                <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                  <div className="relative">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fin-t3)]" aria-hidden="true"/>
                    <input
                      value={search} onChange={e=>setSearch(e.target.value)}
                      placeholder="Rechercher…"
                      aria-label="Rechercher un titre BRVM"
                      className={cn('pl-7 pr-3 h-7 text-[11px] rounded border w-40 font-mono',
                        'bg-[var(--fin-panel)] border-[var(--fin-border)] text-[var(--fin-t1)]',
                        'focus:outline-none focus:border-[var(--fin-blue)] placeholder:text-[var(--fin-t3)]')}/>
                  </div>
                  <select value={filterSector} onChange={e=>setFilterSector(e.target.value)}
                    aria-label="Filtrer par secteur"
                    className={cn('h-7 px-2 text-[11px] rounded border font-mono',
                      'bg-[var(--fin-panel)] border-[var(--fin-border)] text-[var(--fin-t2)]',
                      'focus:outline-none focus:border-[var(--fin-blue)]')}>
                    <option value="">Tous secteurs</option>
                    {sectors.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}
                    aria-label="Filtrer par pays"
                    className={cn('h-7 px-2 text-[11px] rounded border font-mono',
                      'bg-[var(--fin-panel)] border-[var(--fin-border)] text-[var(--fin-t2)]',
                      'focus:outline-none focus:border-[var(--fin-blue)]')}>
                    <option value="">Tous pays</option>
                    {countries.map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]??''} {c}</option>)}
                  </select>
                  <span className="text-[9px] font-mono text-[var(--fin-t3)]">
                    <span className="text-[var(--fin-t1)] font-bold">{filtered.length}</span> titre{filtered.length>1?'s':''}
                  </span>
                </div>
                {/* Table virtualisée */}
                <table className="w-full flex-shrink-0">
                  <thead className={cn('border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                    <tr>
                      <TH col="symbol"        label="Symbole"/>
                      <TH col="name"          label="Société"/>
                      <TH col="price"         label="Cours XOF"   right/>
                      <TH col="changePercent" label="Var%"         right/>
                      <TH col="volume"        label="Volume"       right/>
                      <TH col="marketCap"     label="Cap. (M XOF)" right/>
                      <TH col="sector"        label="Secteur"/>
                      <TH col="country"       label="Pays"/>
                    </tr>
                  </thead>
                </table>
                <div ref={tableParentRef} className="flex-1 overflow-auto">
                  {loading ? (
                    Array.from({length:10}).map((_,i) => <SkeletonRow key={i} cols={8}/>)
                  ) : (
                    <div style={{height:rowVirtualizer.getTotalSize(),position:'relative'}}>
                      {rowVirtualizer.getVirtualItems().map(vRow => {
                        const q = filtered[vRow.index]
                        const up = q.changePercent > 0
                        return (
                          <div key={q.symbol}
                            style={{position:'absolute',top:0,left:0,width:'100%',height:`${vRow.size}px`,transform:`translateY(${vRow.start}px)`}}
                            className={cn('flex items-center border-b border-[var(--fin-border)] hover:bg-[var(--fin-hover)] transition-colors')}>
                            <table className="w-full text-[11px]"><tbody><tr>
                              <td className="px-3 py-1.5 font-mono font-bold text-[var(--fin-t1)] w-16">{q.symbol}</td>
                              <td className="px-3 py-1.5 text-[var(--fin-t2)] max-w-44 truncate">{q.name}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-[var(--fin-t1)] tabular-nums">{q.price>0?q.price.toLocaleString('fr-FR'):'—'}</td>
                              <td className={cn('px-3 py-1.5 text-right font-mono font-bold tabular-nums',up?'text-[var(--fin-green)]':q.changePercent<0?'text-[var(--fin-red)]':'text-[var(--fin-t3)]')}>
                                {up?'▲':'▼'}{Math.abs(q.changePercent).toFixed(2)}%
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-[var(--fin-t2)] tabular-nums">{fmtVol(q.volume)}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-[var(--fin-t2)] tabular-nums">{fmtXOF(q.marketCap)}</td>
                              <td className="px-3 py-1.5"><span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono', sectorPill(q.sector))}>{q.sector}</span></td>
                              <td className="px-3 py-1.5 text-[9px] text-[var(--fin-t3)] font-mono whitespace-nowrap">{COUNTRY_FLAGS[q.country]??''} {q.country}</td>
                            </tr></tbody></table>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className={cn('flex items-center px-3 py-1 border-t border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
                  <span className="text-[9px] font-mono text-[var(--fin-t3)]">
                    <span className="text-[var(--fin-t1)] font-bold">{filtered.length}</span> titres · trié par <span className="text-[var(--fin-blue)] font-bold">{sortKey}</span> {sortDir==='desc'?'↓':'↑'}
                  </span>
                </div>
              </div>
            )}

            {/* ═══ SECTEURS ═════════════════════════════════ */}
            {tab==='sectors' && market && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className={cn('rounded-lg border border-[var(--fin-border)]','bg-[var(--fin-panel)] p-3')}>
                    <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-2">Capitalisation par secteur</p>
                    <SectorPieChart sectors={market.sectors}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {market.sectors.map(s => (
                      <div key={s.sector} className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                        <div className="flex items-start justify-between mb-1">
                          <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono', sectorPill(s.sector))}>{s.sector}</span>
                          <span className={cn('text-[10px] font-bold font-mono', s.avgChange>0?'text-[var(--fin-green)]':s.avgChange<0?'text-[var(--fin-red)]':'text-[var(--fin-t3)]')}>
                            {s.avgChange>0?'+':''}{s.avgChange.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-xs font-bold font-mono text-[var(--fin-t1)] tabular-nums">{fmtXOF(s.marketCap)} XOF</p>
                        <p className="text-[9px] text-[var(--fin-t3)] font-mono">{s.stockCount} sociétés</p>
                        <div className="flex gap-2 mt-1 text-[9px] font-mono">
                          <span className="text-[var(--fin-green)]">▲{s.advancers}</span>
                          <span className="text-[var(--fin-t3)]">—{s.unchanged}</span>
                          <span className="text-[var(--fin-red)]">▼{s.decliners}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PAYS UEMOA ═══════════════════════════════ */}
            {tab==='countries' && (
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Côte d'Ivoire",'Hub financier régional'],['Sénégal','Pétrole + telecom'],['Burkina Faso','Mines + télécom'],['Bénin','Logistique portuaire'],['Mali','Secteur bancaire'],['Niger','Ressources naturelles'],['Togo','Finance + Ecobank'],['Guinée-Bissau','Économie émergente']].map(([country,desc]) => {
                  const qs = quotes.filter(q=>q.country===country)
                  const mc = qs.reduce((s,q)=>s+(q.marketCap??0),0)
                  return (
                    <div key={country} className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" role="img" aria-label={country}>{COUNTRY_FLAGS[country]??'🌍'}</span>
                        <div>
                          <p className="text-[10px] font-bold text-[var(--fin-t1)]">{country}</p>
                          <p className="text-[9px] text-[var(--fin-t3)]">{desc}</p>
                        </div>
                      </div>
                      <p className="text-xl font-black text-[var(--fin-blue)] font-mono tabular-nums">{qs.length}</p>
                      <p className="text-[9px] text-[var(--fin-t3)] font-mono mb-1">société{qs.length>1?'s':''} cotée{qs.length>1?'s':''}</p>
                      <p className="text-[10px] font-semibold font-mono text-[var(--fin-t2)]">{fmtXOF(mc)} XOF</p>
                      <div className="flex flex-wrap gap-0.5 mt-1.5">
                        {qs.slice(0,3).map(q=><span key={q.symbol} className="px-1 py-0.5 bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] text-[8px] font-mono rounded">{q.symbol}</span>)}
                        {qs.length>3&&<span className="px-1 py-0.5 bg-[var(--fin-surface)] text-[var(--fin-t3)] text-[8px] font-mono rounded">+{qs.length-3}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ═══ OUTIL 1 — LIQUIDITÉ ══════════════════════ */}
            {tab==='liquidity' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-blue)]"
                  title="Analyseur de Liquidité — Méthode Amihud (2002)"
                  text="Ratio Amihud = |Rendement| / Volume en XOF. Plus faible = plus liquide. DtL = jours nécessaires pour liquider 1M XOF à 30% du volume journalier (règle institutionnelle)."
                  source="Amihud (2002) Journal of Financial Markets · Koné & Traoré (2019) AERC"/>
                {loadingTab ? (
                  <div className="flex-1">
                    {Array.from({length:12}).map((_,i) => <SkeletonRow key={i} cols={7}/>)}
                  </div>
                ) : (
                  <>
                    {/* Résumé catégories */}
                    <div className={cn('flex gap-3 px-3 py-2 border-b border-[var(--fin-border)] overflow-x-auto','bg-[var(--fin-surface)]')}>
                      {(['Très liquide','Liquide','Modéré','Illiquide','Très illiquide'] as const).map(cat => {
                        const n = liquidity.filter(l=>l.category===cat).length
                        const colors: Record<string,string> = {
                          'Très liquide':'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
                          'Liquide':      'bg-[var(--fin-blue-bg)]  text-[var(--fin-blue)]',
                          'Modéré':       'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]',
                          'Illiquide':    'bg-[var(--fin-red-bg)]   text-[var(--fin-red)]',
                          'Très illiquide':'bg-[var(--fin-red-bg)]  text-[var(--fin-red)]',
                        }
                        return (
                          <div key={cat} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold font-mono whitespace-nowrap', colors[cat])}>
                            <span className="text-base tabular-nums">{n}</span>{cat}
                          </div>
                        )
                      })}
                    </div>
                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className={cn('sticky top-0 z-10 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                          <tr>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)] w-8">#</th>
                            <TH col="symbol" label="Symbole"/>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)] w-12">Score</th>
                            <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)]">Catégorie</th>
                            <TH col="tradingFreq"      label="Fréq." right/>
                            <TH col="avgVolume30d"     label="Vol. moy 30j" right/>
                            <TH col="dtlEstimateDays"  label="DtL (1M XOF)" right/>
                            <TH col="sector"           label="Secteur"/>
                          </tr>
                        </thead>
                        <tbody>
                          {liquidity.map((l,i) => {
                            const catColors: Record<string,string> = {
                              'Très liquide':'bg-[var(--fin-green-bg)] text-[var(--fin-green)]','Liquide':'bg-[var(--fin-blue-bg)] text-[var(--fin-blue)]',
                              'Modéré':'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]','Illiquide':'bg-[var(--fin-red-bg)] text-[var(--fin-red)]','Très illiquide':'bg-[var(--fin-red-bg)] text-[var(--fin-red)]',
                            }
                            return (
                              <tr key={l.symbol} className="border-b border-[var(--fin-border)] hover:bg-[var(--fin-hover)] transition-colors">
                                <td className="px-3 py-1.5 text-[9px] font-mono text-[var(--fin-t3)]">{i+1}</td>
                                <td className="px-3 py-1.5">
                                  <span className="font-mono font-bold text-[11px] text-[var(--fin-t1)]">{l.symbol}</span>
                                  {l.isInBRVM10&&<span className="ml-1.5 px-1 py-0.5 bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] text-[8px] font-mono rounded font-bold">BRVM10</span>}
                                </td>
                                <td className="px-3 py-1.5">
                                  <ScoreGauge value={l.liquidityScore} size={36}/>
                                </td>
                                <td className="px-3 py-1.5"><span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono', catColors[l.category]??'')}>{l.category}</span></td>
                                <td className="px-3 py-1.5 text-right font-mono text-[11px] text-[var(--fin-t1)] tabular-nums">{l.tradingFreq}%</td>
                                <td className="px-3 py-1.5 text-right font-mono text-[10px] text-[var(--fin-t2)] tabular-nums">{fmtXOF(l.avgVolume30d)} XOF</td>
                                <td className={cn('px-3 py-1.5 text-right font-mono text-[11px] font-bold tabular-nums', l.dtlEstimateDays<=3?'text-[var(--fin-green)]':l.dtlEstimateDays<=10?'text-[var(--fin-amber)]':'text-[var(--fin-red)]')}>
                                  {l.dtlEstimateDays>=999?'>1 an':`${l.dtlEstimateDays}j`}
                                </td>
                                <td className="px-3 py-1.5"><span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono', sectorPill(l.sector))}>{l.sector}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ OUTIL 2 — DIVIDENDES ═════════════════════ */}
            {tab==='dividends' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-green)]"
                  title="Screener Dividendes — Modèle Gordon-Shapiro"
                  text="Rendement moyen BRVM : 4,2–6,8% vs 1,5–2% CAC 40. Valeur Gordon P=D₁/(k−g) avec k=10% (prime de risque Africa). Sous-valorisé si cours < Gordon×0,9."
                  source="Gordon & Shapiro (1956) · CGF Bourse Research 2023 · NSIA Finance"/>
                {loadingTab ? (
                  Array.from({length:10}).map((_,i) => <SkeletonRow key={i} cols={8}/>)
                ) : (
                  <>
                    {/* KPI row */}
                    <div className={cn('grid grid-cols-4 gap-px border-b border-[var(--fin-border)]','bg-[var(--fin-border)]')}>
                      {[
                        {label:'Rdt moyen', value:`${(dividends.filter(d=>d.currentYield>0).reduce((s,d)=>s+d.currentYield,0)/(dividends.filter(d=>d.currentYield>0).length||1)).toFixed(2)}%`, sub:'Titres avec dividende'},
                        {label:'Qualifiés 3ans+', value:String(dividends.filter(d=>d.qualified).length), sub:'Dividende ≥3 ans'},
                        {label:'Top rdt', value:dividends[0]?`${dividends[0].symbol} ${dividends[0].currentYield.toFixed(1)}%`:'-', sub:'Meilleur du marché'},
                        {label:'Rdt médian', value:`${(dividends.filter(d=>d.currentYield>0).sort((a,b)=>a.currentYield-b.currentYield)[Math.floor(dividends.filter(d=>d.currentYield>0).length/2)]?.currentYield??0).toFixed(2)}%`, sub:'Médiane BRVM'},
                      ].map(({label,value,sub}) => (
                        <div key={label} className={cn('px-3 py-2','bg-[var(--fin-panel)]')}>
                          <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">{label}</p>
                          <p className="text-sm font-black text-[var(--fin-t1)] font-mono mt-0.5">{value}</p>
                          <p className="text-[9px] text-[var(--fin-t3)] font-mono">{sub}</p>
                        </div>
                      ))}
                    </div>
                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className={cn('sticky top-0 z-10 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                          <tr>
                            {['SYMBOLE','SOCIÉTÉ','COURS XOF','DERNIER DIV.','RENDEMENT','TAUX DISTR.','HISTORIQUE','VALEUR GORDON','SIGNAL','SECTEUR'].map(h=>(
                              <th key={h} className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)] whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dividends.filter(d=>d.lastDividend>0).map(d => {
                            const gs = d.gordonFairValue&&d.currentPrice>0
                              ? d.currentPrice<d.gordonFairValue*0.9 ? 'Sous-valorisé'
                                : d.currentPrice>d.gordonFairValue*1.1 ? 'Sur-valorisé' : 'Juste valeur'
                              : null
                            return (
                              <tr key={d.symbol} className="border-b border-[var(--fin-border)] hover:bg-[var(--fin-hover)] transition-colors">
                                <td className="px-3 py-1.5 font-mono font-bold text-[11px] text-[var(--fin-t1)]">{d.symbol}</td>
                                <td className="px-3 py-1.5 text-[10px] text-[var(--fin-t2)] max-w-36 truncate">{d.name}</td>
                                <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--fin-t1)] tabular-nums">{d.currentPrice>0?d.currentPrice.toLocaleString('fr-FR'):'—'}</td>
                                <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--fin-t2)] tabular-nums">{d.lastDividend.toLocaleString('fr-FR')}</td>
                                <td className="px-3 py-1.5">
                                  <span className={cn('font-bold font-mono text-[11px] tabular-nums', d.currentYield>=6?'text-[var(--fin-green)]':d.currentYield>=4?'text-[var(--fin-green)]':d.currentYield>=2?'text-[var(--fin-amber)]':'text-[var(--fin-t3)]')}>
                                    {d.currentYield>0?`${d.currentYield.toFixed(2)}%`:'—'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 font-mono text-[10px] text-[var(--fin-t2)]">{d.payoutRatio?`${d.payoutRatio}%`:'—'}</td>
                                <td className="px-3 py-1.5">
                                  <DividendBarChart history={d.history.slice(0,4)} height={32}/>
                                  <span className="text-[8px] text-[var(--fin-t3)] font-mono">{d.consistency}an{d.consistency>1?'s':''}</span>
                                </td>
                                <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--fin-t2)] tabular-nums">{d.gordonFairValue?d.gordonFairValue.toLocaleString('fr-FR'):'—'}</td>
                                <td className="px-3 py-1.5">
                                  {gs&&<span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono',gs==='Sous-valorisé'?'bg-[var(--fin-green-bg)] text-[var(--fin-green)]':gs==='Sur-valorisé'?'bg-[var(--fin-red-bg)] text-[var(--fin-red)]':'bg-[var(--fin-surface)] text-[var(--fin-t2)]')}>{gs}</span>}
                                </td>
                                <td className="px-3 py-1.5"><span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono', sectorPill(d.sector))}>{d.sector}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ OUTIL 3 — COMMODITÉS ═════════════════════ */}
            {tab==='commodities' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-amber)]"
                  title="Corrélation Matières Premières — Pearson 90 jours"
                  text="Agriculture/Pétrole BRVM corrélée aux indices ICE Futures et CME. Corrélation >0,6 = liaison forte. Divergence YTD >10% = signal sous/sur-valorisation."
                  source="Yahoo Finance (commodities) · Ezzahid & Elouaourti (2020)"/>
                {loadingTab ? (
                  Array.from({length:8}).map((_,i) => <SkeletonRow key={i} cols={4}/>)
                ) : commodities.length===0 ? (
                  <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
                    <p className="text-[10px] font-mono">Calcul des corrélations en cours… (Yahoo Finance)</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    <div className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                      <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-2">Vue d'ensemble — corrélations 90j</p>
                      <CorrelationHeatmap correlations={commodities.filter(c=>c.correlation90d!==0)}/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {commodities.map(c => (
                        <div key={c.symbol} className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-mono font-bold text-[11px] text-[var(--fin-t1)]">{c.symbol}</span>
                              <span className="text-[9px] text-[var(--fin-t3)] ml-2">vs {c.primaryCommodity}</span>
                            </div>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono',
                              c.signal==='Sous-valorisé'?'bg-[var(--fin-green-bg)] text-[var(--fin-green)]':
                              c.signal==='Sur-valorisé' ?'bg-[var(--fin-red-bg)]   text-[var(--fin-red)]'  :
                              c.signal==='Non calculé'  ?'bg-[var(--fin-surface)]  text-[var(--fin-t3)]'   :
                                                          'bg-[var(--fin-blue-bg)]  text-[var(--fin-blue)]')}>
                              {c.signal}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {label:'Corrél. 90j', val:c.correlation90d},
                              {label:'Corrél. 30j', val:c.correlation30d},
                              {label:'Divergence YTD', val:c.divergence, isPct:true},
                            ].map(({label,val,isPct}) => (
                              <div key={label} className="text-center">
                                <p className="text-[8px] text-[var(--fin-t3)] font-mono uppercase">{label}</p>
                                <p className={cn('text-sm font-black font-mono tabular-nums', isPct ? (val>0?'text-[var(--fin-red)]':'text-[var(--fin-green)]') : corrColor(val))}>
                                  {val===0?'N/A':`${isPct&&val>0?'+':''}${isPct?val+'%':val.toFixed(2)}`}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-[var(--fin-t2)] mt-2 leading-relaxed">{c.interpretation}</p>
                          <p className="text-[8px] text-[var(--fin-t3)] font-mono mt-1">Fiabilité : {c.confidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ OUTIL 4 — COMPARATEUR AFRIQUE ═══════════ */}
            {tab==='africa' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-blue)]"
                  title="Comparateur Bourses Africaines"
                  text="BRVM : ~14,5 Mds USD de capitalisation. Devise ancrée EUR (0% risque XOF), faible corrélation marchés développés, rdt dividende élevé (5-7%). Comparaison métriques normalisées."
                  source="ASEA Annual Statistics 2023 · FMI WEO Oct 2024 · Banque Mondiale GFDD 2024"/>
                {loadingTab ? (
                  Array.from({length:6}).map((_,i) => <SkeletonRow key={i} cols={5}/>)
                ) : (
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    <div className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                      <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-2">Radar — métriques normalisées sur 100</p>
                      <AfricaRadarChart markets={africa}/>
                    </div>
                    <table className="w-full">
                      <thead className={cn('border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                        <tr>
                          {['MARCHÉ','PAYS','DEVISE','P/E','RDT DIV.','PERF YTD','MKT CAP','VOLATILITÉ'].map(h=>(
                            <th key={h} className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {africa.map(m => (
                          <tr key={m.market}
                            className={cn('border-b border-[var(--fin-border)] transition-colors hover:bg-[var(--fin-hover)]',
                              m.market==='BRVM'&&'bg-[var(--fin-green-bg)]')}>
                            <td className="px-3 py-2">
                              <span className="font-mono font-bold text-[11px] text-[var(--fin-t1)]">{m.market}</span>
                              {m.market==='BRVM'&&<span className="ml-1.5 px-1 py-0.5 bg-[var(--fin-green-bg)] text-[var(--fin-green)] text-[8px] font-mono rounded font-bold">NOTRE MARCHÉ</span>}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-[var(--fin-t2)]">{m.country}</td>
                            <td className="px-3 py-2 font-mono text-[10px] text-[var(--fin-t3)]">{m.currency}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-[var(--fin-t1)] tabular-nums">{m.peRatio?`${m.peRatio}x`:'—'}</td>
                            <td className={cn('px-3 py-2 font-mono text-[11px] font-bold tabular-nums', m.dividendYield&&m.dividendYield>=4?'text-[var(--fin-green)]':'text-[var(--fin-t2)]')}>{m.dividendYield?`${m.dividendYield}%`:'—'}</td>
                            <td className={cn('px-3 py-2 font-mono text-[11px] font-bold tabular-nums', m.ytdReturn!=null?(m.ytdReturn>=0?'text-[var(--fin-green)]':'text-[var(--fin-red)]'):'text-[var(--fin-t3)]')}>
                              {m.ytdReturn!=null?`${m.ytdReturn>0?'+':''}${m.ytdReturn}%`:'—'}
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px] text-[var(--fin-t2)]">
                              {m.marketCapUSD?`$${m.marketCapUSD>=1000?(m.marketCapUSD/1000).toFixed(0)+'B':m.marketCapUSD+'M'}`:'—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold font-mono',
                                m.volatility==='Faible'?'bg-[var(--fin-green-bg)] text-[var(--fin-green)]':
                                m.volatility==='Modérée'?'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]':
                                'bg-[var(--fin-red-bg)] text-[var(--fin-red)]')}>
                                {m.volatility??'—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ═══ OUTIL 5 — MACRO UEMOA ════════════════════ */}
            {tab==='macro' && (
              <div className="flex flex-col h-full">
                {macro ? (
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    {/* KPIs BCEAO */}
                    <div className={cn('grid grid-cols-4 gap-px border border-[var(--fin-border)] rounded-lg overflow-hidden','bg-[var(--fin-border)]')}>
                      {[
                        {label:'TAUX BCEAO', value:`${macro.bceaoRate}%`, color:'text-[var(--fin-blue)]',  sub:'Taux directeur'},
                        {label:'INFLATION',  value:`${macro.inflation}%`, color:'text-[var(--fin-amber)]', sub:'Zone UEMOA 2024'},
                        {label:'CROISSANCE PIB', value:`${macro.gdpGrowth}%`, color:'text-[var(--fin-green)]', sub:'FMI WEO 2024'},
                        {label:'MISE À JOUR', value:macro.lastUpdated, color:'text-[var(--fin-t2)]', sub:'FMI · BCEAO'},
                      ].map(({label,value,color,sub}) => (
                        <div key={label} className={cn('px-3 py-2','bg-[var(--fin-panel)]')}>
                          <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">{label}</p>
                          <p className={cn('text-xl font-black font-mono mt-0.5 tabular-nums', color)}>{value}</p>
                          <p className="text-[9px] text-[var(--fin-t3)] font-mono">{sub}</p>
                        </div>
                      ))}
                    </div>
                    {/* Indicateurs */}
                    <div className="space-y-1">
                      {macro.indicators.map(ind => (
                        <div key={ind.name} className={cn('rounded-lg border border-[var(--fin-border)] px-3 py-2','bg-[var(--fin-panel)]')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                                  ind.impact==='positif'?'bg-[var(--fin-green)]':ind.impact==='négatif'?'bg-[var(--fin-red)]':'bg-[var(--fin-t3)]')}/>
                                <p className="text-[11px] font-bold text-[var(--fin-t1)]">{ind.name}</p>
                                <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold font-mono',
                                  ind.impact==='positif'?'bg-[var(--fin-green-bg)] text-[var(--fin-green)]':
                                  ind.impact==='négatif'?'bg-[var(--fin-red-bg)]   text-[var(--fin-red)]':
                                  'bg-[var(--fin-surface)] text-[var(--fin-t3)]')}>
                                  {ind.impact}
                                </span>
                              </div>
                              <p className="text-[9px] text-[var(--fin-t2)] mt-0.5 leading-relaxed">{ind.description}</p>
                              <p className="text-[8px] text-[var(--fin-t3)] mt-0.5 font-mono italic">{ind.source}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-mono text-sm font-bold text-[var(--fin-t1)] tabular-nums">
                                {ind.value.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-[var(--fin-t3)]">{ind.unit}</span>
                              </p>
                              <p className={cn('text-[9px] font-mono font-bold',
                                ind.trend==='hausse'?'text-[var(--fin-red)]':ind.trend==='baisse'?'text-[var(--fin-green)]':'text-[var(--fin-t3)]')}>
                                {ind.trend==='hausse'?'↑':ind.trend==='baisse'?'↓':'→'} {ind.previousYear.toLocaleString('fr-FR')} {ind.unit} (N-1)
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Commodités & Risques */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                        <p className="text-[9px] font-bold text-[var(--fin-amber)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Wheat size={9} aria-hidden="true"/> Matières premières clés
                        </p>
                        <div className="space-y-1">
                          {macro.commodityLinks.map(c => (
                            <div key={c.commodity} className={cn('rounded px-2.5 py-2','bg-[var(--fin-surface)]')}>
                              <p className="text-[10px] font-bold text-[var(--fin-t1)]">{c.commodity} <span className="text-[var(--fin-green)] font-mono">{c.price}</span></p>
                              <p className="text-[9px] text-[var(--fin-t3)]">{c.relevance}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className={cn('rounded-lg border border-[var(--fin-border)] p-3','bg-[var(--fin-panel)]')}>
                        <p className="text-[9px] font-bold text-[var(--fin-red)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={9} aria-hidden="true"/> Risques principaux
                        </p>
                        <div className="space-y-1">
                          {macro.risks.map(r => (
                            <div key={r.label} className={cn('rounded px-2.5 py-2','bg-[var(--fin-surface)]')}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold font-mono',
                                  r.level==='Élevé'?'bg-[var(--fin-red-bg)] text-[var(--fin-red)]':
                                  r.level==='Modéré'?'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]':
                                  'bg-[var(--fin-green-bg)] text-[var(--fin-green)]')}>
                                  {r.level}
                                </span>
                                <p className="text-[10px] font-semibold text-[var(--fin-t1)]">{r.label}</p>
                              </div>
                              <p className="text-[9px] text-[var(--fin-t3)]">{r.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : loadingTab ? (
                  Array.from({length:8}).map((_,i) => <SkeletonRow key={i} cols={3}/>)
                ) : null}
              </div>
            )}

            {/* ═══ OUTIL 6 — GOUVERNANCE ════════════════════ */}
            {tab==='governance' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-blue)]"
                  title="Score de Gouvernance — Méthode composite /100"
                  text="Audit (25pts — Big 4) + Transparence (25pts — float + cross-listing) + Dividende (25pts — régularité) + Actionnariat (25pts — qualité parent). Adapté SYSCOHADA/UEMOA."
                  source="Watts & Zimmerman (1986) · CREPMF rapports annuels · BRVM"/>
                {loadingTab ? (
                  Array.from({length:8}).map((_,i) => <SkeletonRow key={i} cols={4}/>)
                ) : (
                  <div className="flex-1 overflow-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {governance.map(g => {
                      const scoreStyle = g.totalScore>=70
                        ? 'border-[var(--fin-green)] bg-[var(--fin-green-bg)]'
                        : g.totalScore>=45
                          ? 'border-[var(--fin-amber)] bg-[var(--fin-amber-bg)]'
                          : 'border-[var(--fin-red)] bg-[var(--fin-red-bg)]'
                      return (
                        <div key={g.symbol} className={cn('rounded-lg border p-3', scoreStyle, 'border-opacity-30')}>
                          <div className="mb-2">
                            <p className="font-mono font-bold text-[11px] text-[var(--fin-t1)]">
                              {g.symbol} <span className="font-normal text-[var(--fin-t2)] text-[10px]">— {g.name}</span>
                            </p>
                            <p className="text-[9px] text-[var(--fin-t3)] font-mono">{g.auditor}{g.parentCompany&&` · ${g.parentCompany}`}</p>
                          </div>
                          <GovernanceGauge total={g.totalScore} audit={g.auditScore} transparency={g.transparencyScore} dividend={g.dividendScore} parent={g.parentScore}/>
                          {(g.strengths.length>0||g.warnings.length>0) && (
                            <div className="mt-2 space-y-0.5">
                              {g.strengths.map(s=><div key={s} className="flex items-center gap-1.5 text-[9px] text-[var(--fin-green)]"><CheckCircle size={9}/>{s}</div>)}
                              {g.warnings.map(w=><div key={w} className="flex items-center gap-1.5 text-[9px] text-[var(--fin-red)]"><AlertTriangle size={9}/>{w}</div>)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ OUTIL 7 — SIMULATEUR COÛT ═══════════════ */}
            {tab==='cost' && (
              <div className="flex flex-col h-full">
                <InfoBanner
                  color="text-[var(--fin-cyan)]"
                  title="Simulateur de Coût de Transaction — Barème CREPMF 2024"
                  text="Commission SGI 0,60% + BRVM 0,15% + CREPMF 0,03% + Dépositaire 0,02% = 0,80% total. Sur un aller-retour, il faut au minimum 1,60% de rendement pour être rentable."
                  source="Barème CREPMF 2024 · Codes Généraux des Impôts UEMOA"/>
                <div className="flex-1 overflow-auto p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Formulaire */}
                    <div className={cn('rounded-lg border border-[var(--fin-border)] p-4','bg-[var(--fin-panel)]')}>
                      <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest mb-3">Paramètres</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">Montant (XOF)</label>
                          <input type="number" value={costForm.amount} onChange={e=>setCostForm(f=>({...f,amount:e.target.value}))}
                            className={cn('w-full h-7 px-2 text-xs font-mono rounded border','bg-[var(--fin-surface)] border-[var(--fin-border)] text-[var(--fin-t1)]','focus:outline-none focus:border-[var(--fin-blue)]')}/>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">Type</label>
                          <div className="flex gap-2">
                            {[['buy','ACHAT'],['sell','VENTE']].map(([v,l])=>(
                              <button key={v} onClick={()=>setCostForm(f=>({...f,type:v}))}
                                className={cn('flex-1 h-7 text-xs font-bold font-mono rounded border transition-colors',
                                  costForm.type===v
                                    ? v==='buy'?'bg-[var(--fin-green-bg)] border-[var(--fin-green)] text-[var(--fin-green)]':'bg-[var(--fin-red-bg)] border-[var(--fin-red)] text-[var(--fin-red)]'
                                    : 'bg-[var(--fin-surface)] border-[var(--fin-border)] text-[var(--fin-t3)] hover:text-[var(--fin-t2)]')}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">Pays de résidence</label>
                          <select value={costForm.country} onChange={e=>setCostForm(f=>({...f,country:e.target.value}))}
                            className={cn('w-full h-7 px-2 text-xs font-mono rounded border','bg-[var(--fin-surface)] border-[var(--fin-border)] text-[var(--fin-t1)]','focus:outline-none focus:border-[var(--fin-blue)]')}>
                            {[['CI',"🇨🇮 Côte d'Ivoire (15%)"],['SN','🇸🇳 Sénégal (10%)'],['BF','🇧🇫 Burkina Faso (12,5%)'],['BJ','🇧🇯 Bénin (10%)'],['ML','🇲🇱 Mali (10%)'],['NE','🇳🇪 Niger (10%)'],['TG','🇹🇬 Togo (10%)'],['GW','🇬🇼 Guinée-Bissau (10%)']].map(([k,l])=><option key={k} value={k}>{l}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="includeTax" checked={costForm.includeTax} onChange={e=>setCostForm(f=>({...f,includeTax:e.target.checked}))} className="w-3.5 h-3.5"/>
                          <label htmlFor="includeTax" className="text-[10px] text-[var(--fin-t2)] cursor-pointer">Inclure retenue à la source dividendes</label>
                        </div>
                        {costForm.includeTax&&(
                          <div>
                            <label className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide block mb-1">Montant dividende (XOF)</label>
                            <input type="number" value={costForm.dividendAmount} onChange={e=>setCostForm(f=>({...f,dividendAmount:e.target.value}))}
                              placeholder="Ex: 11500 (SONATEL)"
                              className={cn('w-full h-7 px-2 text-xs font-mono rounded border','bg-[var(--fin-surface)] border-[var(--fin-border)] text-[var(--fin-t1)]','focus:outline-none focus:border-[var(--fin-blue)] placeholder:text-[var(--fin-t3)]')}/>
                          </div>
                        )}
                        <button onClick={runCostSimulator}
                          className="w-full h-8 text-xs font-bold rounded bg-[var(--fin-blue)] text-white hover:opacity-90 transition-opacity">
                          Calculer les frais
                        </button>
                      </div>
                    </div>
                    {/* Résultat */}
                    {costResult && (
                      <div className={cn('rounded-lg border border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
                        <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest px-3 py-2 border-b border-[var(--fin-border)]">Résultat de la simulation</p>
                        <div className="p-3 space-y-1">
                          {[
                            {label:'Montant brut',             val:`${costResult.grossAmount.toLocaleString('fr-FR')} XOF`, cls:'text-[var(--fin-t1)]'},
                            {label:'Commission SGI (0,60%)',    val:`− ${costResult.brokerFee.toLocaleString('fr-FR')} XOF`,  cls:'text-[var(--fin-red)]'},
                            {label:'Frais BRVM (0,15%)',        val:`− ${costResult.brvmFee.toLocaleString('fr-FR')} XOF`,   cls:'text-[var(--fin-red)]'},
                            {label:'Frais CREPMF (0,03%)',      val:`− ${costResult.crepmfFee.toLocaleString('fr-FR')} XOF`, cls:'text-[var(--fin-red)]'},
                            {label:'Dépositaire (0,02%)',       val:`− ${costResult.csdFee.toLocaleString('fr-FR')} XOF`,    cls:'text-[var(--fin-red)]'},
                            ...(costResult.withholdingTax?[{label:'Retenue dividendes', val:`− ${costResult.withholdingTax.toLocaleString('fr-FR')} XOF`, cls:'text-[var(--fin-amber)]'}]:[]),
                          ].map(({label,val,cls}) => (
                            <div key={label} className="flex justify-between py-1 border-b border-[var(--fin-border)] last:border-0">
                              <span className="text-[9px] text-[var(--fin-t3)] font-mono">{label}</span>
                              <span className={cn('text-[10px] font-bold font-mono tabular-nums', cls)}>{val}</span>
                            </div>
                          ))}
                          <div className={cn('flex justify-between py-2 rounded px-2 mt-1','bg-[var(--fin-surface)]')}>
                            <span className="text-[9px] font-bold text-[var(--fin-t2)] font-mono uppercase">Total frais</span>
                            <span className="text-[10px] font-black text-[var(--fin-red)] font-mono tabular-nums">− {costResult.totalFees.toLocaleString('fr-FR')} XOF ({costResult.totalFeePct}%)</span>
                          </div>
                          <div className={cn('flex justify-between py-2 rounded px-2','bg-[var(--fin-blue-bg)]')}>
                            <span className="text-[9px] font-bold text-[var(--fin-blue)] font-mono uppercase">{costForm.type==='buy'?'Total déboursé':'Net reçu'}</span>
                            <span className="text-[10px] font-black text-[var(--fin-blue)] font-mono tabular-nums">{costResult.netAmount.toLocaleString('fr-FR')} XOF</span>
                          </div>
                          <div className={cn('rounded px-3 py-2 mt-1','bg-[var(--fin-amber-bg)] border border-[var(--fin-amber)] border-opacity-25')}>
                            <p className="text-[9px] font-bold text-[var(--fin-amber)] uppercase tracking-wide">Seuil de rentabilité (aller-retour)</p>
                            <p className="text-lg font-black text-[var(--fin-amber)] font-mono mt-0.5 tabular-nums">{costResult.breakEvenYield}%</p>
                            <p className="text-[9px] text-[var(--fin-t2)] mt-0.5">Rendement minimum pour couvrir les frais d'un aller-retour</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
