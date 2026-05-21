'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDebounceValue } from 'usehooks-ts'
import { motion } from 'framer-motion'
import {
  Globe, TrendingUp, TrendingDown, BarChart3, MapPin,
  Building2, RefreshCw, ChevronDown, ChevronUp, Search,
  Droplets, DollarSign, Wheat, BarChart2, Activity,
  Shield, Calculator, Info, AlertTriangle, CheckCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'
import CountUp from 'react-countup'
import {
  ScoreGauge, GovernanceGauge, KPICounter,
  DividendBarChart, AfricaRadarChart, SectorPieChart, CorrelationHeatmap,
} from '@/components/brvm/BRVMCharts'

const CountUpSafe = ({ end }: { end: number }) => <CountUp end={end} duration={1.2} useEasing />

/* ── Types ──────────────────────────────────────────────── */
interface BRVMQuote { symbol:string; name:string; price:number; change:number; changePercent:number; volume:number; marketCap?:number; sector:string; country:string; currency:string }
interface BRVMIndex { name:string; value:number; change:number; changePercent:number; date:string }
interface BRVMSector { sector:string; stockCount:number; marketCap:number; advancers:number; decliners:number; unchanged:number; avgChange:number }
interface BRVMMarket { indices:BRVMIndex[]; totalMarketCap:number; totalVolume:number; advancers:number; decliners:number; unchanged:number; topGainers:BRVMQuote[]; topLosers:BRVMQuote[]; sectors:BRVMSector[]; date:string }
interface LiquidityScore { symbol:string; name:string; amihudRatio:number; tradingFreq:number; avgVolume30d:number; dtlEstimateDays:number; liquidityScore:number; category:string; sector:string; isInBRVM10:boolean }
interface DividendData { symbol:string; name:string; currentPrice:number; lastDividend:number; currentYield:number; payoutRatio?:number; history:{year:number;amount:number;yield?:number}[]; consistency:number; exDividendDate?:string; gordonFairValue?:number; sector:string; country:string; qualified:boolean }
interface CommodityCorr { symbol:string; name:string; primaryCommodity:string; correlation90d:number; correlation30d:number; divergence:number; signal:string; confidence:string; interpretation:string }
interface AfricanMarket { market:string; country:string; indexName:string; currency:string; peRatio?:number; dividendYield?:number; ytdReturn?:number; marketCapUSD?:number; volatility?:string; mainSectors:string[]; description:string; source:string }
interface MacroIndicator { name:string; value:number; unit:string; previousYear:number; trend:string; impact:string; description:string; source:string }
interface MacroDashboard { lastUpdated:string; bceaoRate:number; inflation:number; gdpGrowth:number; indicators:MacroIndicator[]; commodityLinks:{commodity:string;price:string;relevance:string}[]; risks:{label:string;level:string;description:string}[] }
interface GovernanceScore { symbol:string; name:string; totalScore:number; auditScore:number; transparencyScore:number; dividendScore:number; parentScore:number; auditor?:string; parentCompany?:string; floatPct?:number; riskLevel:string; strengths:string[]; warnings:string[] }

/* ── Helpers ────────────────────────────────────────────── */
const fmtXOF = (n?:number) => {
  if (n==null) return '—'
  if (n>=1e12) return `${(n/1e12).toFixed(2)} T XOF`
  if (n>=1e9)  return `${(n/1e9).toFixed(2)} Md XOF`
  if (n>=1e6)  return `${(n/1e6).toFixed(2)} M XOF`
  return `${n.toLocaleString('fr-FR')} XOF`
}
const fmtVol = (n:number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(0)}K`:n.toString()
const COUNTRY_FLAGS: Record<string,string> = { "Côte d'Ivoire":'🇨🇮','Sénégal':'🇸🇳','Burkina Faso':'🇧🇫','Bénin':'🇧🇯','Mali':'🇲🇱','Niger':'🇳🇪','Togo':'🇹🇬','Guinée-Bissau':'🇬🇼' }
const SECTOR_COLORS: Record<string,string> = { Agriculture:'bg-green-100 text-green-700',Banque:'bg-blue-100 text-blue-700',Télécoms:'bg-purple-100 text-purple-700',Industrie:'bg-orange-100 text-orange-700',Distribution:'bg-yellow-100 text-yellow-700',Energie:'bg-red-100 text-red-700',Logistique:'bg-gray-100 text-gray-700',Automobile:'bg-indigo-100 text-indigo-700',Transport:'bg-teal-100 text-teal-700' }
const corrColor = (r:number) => r>=0.6?'text-green-600':r>=0.3?'text-yellow-600':r<=-0.3?'text-blue-600':'text-gray-400'
const scoreColor = (s:number) => s>=70?'text-green-600':s>=45?'text-yellow-600':'text-red-600'
const scoreBg = (s:number) => s>=70?'bg-green-50 border-green-200':s>=45?'bg-yellow-50 border-yellow-200':'bg-red-50 border-red-200'

/* ── Tab groups ─────────────────────────────────────────── */
type Tab = 'overview'|'quotes'|'sectors'|'countries'|'liquidity'|'dividends'|'commodities'|'africa'|'macro'|'governance'|'cost'

const TAB_GROUPS = [
  { label:'Marché',  tabs:[
    { key:'overview'  as Tab, label:'Vue marché',   Icon:BarChart3   },
    { key:'quotes'    as Tab, label:'Cotations',    Icon:TrendingUp  },
    { key:'sectors'   as Tab, label:'Secteurs',     Icon:Building2   },
    { key:'countries' as Tab, label:'Pays',         Icon:MapPin      },
  ]},
  { label:'Analyse', tabs:[
    { key:'liquidity'   as Tab, label:'Liquidité',          Icon:Droplets   },
    { key:'dividends'   as Tab, label:'Dividendes',         Icon:DollarSign },
    { key:'commodities' as Tab, label:'Matières premières', Icon:Wheat      },
    { key:'governance'  as Tab, label:'Gouvernance',        Icon:Shield     },
  ]},
  { label:'Macro & Outils', tabs:[
    { key:'africa' as Tab, label:'Comparateur Afrique', Icon:Globe      },
    { key:'macro'  as Tab, label:'Macro UEMOA',         Icon:Activity   },
    { key:'cost'   as Tab, label:'Simulateur coût',     Icon:Calculator },
  ]},
]

/* ══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
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
  const [sortKey, setSortKey] = useState<string>('marketCap')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [filterSector, setFilterSector] = useState('')
  const [filterCountry, setFilterCountry] = useState('')

  // Simulateur coût
  const [costForm, setCostForm] = useState({ amount:'1000000', type:'buy', country:'CI', includeTax:false, dividendAmount:'' })
  const [costResult, setCostResult] = useState<any>(null)

  const loadCore = useCallback(async () => {
    setLoading(true)
    try {
      const [mkt, qts] = await Promise.all([
        api.get('/market/brvm/market'),
        api.get('/market/brvm'),
      ])
      setMarket(mkt.data); setQuotes(qts.data)
    } catch { toast.error('Données BRVM non disponibles') }
    finally { setLoading(false) }
  }, [])

  const loadTab = useCallback(async (t: Tab) => {
    setLoadingTab(true)
    try {
      if (t === 'liquidity'   && !liquidity.length)   { const r = await api.get('/market/brvm/tools/liquidity');   setLiquid(r.data) }
      if (t === 'dividends'   && !dividends.length)   { const r = await api.get('/market/brvm/tools/dividends');   setDivs(r.data) }
      if (t === 'commodities' && !commodities.length) { const r = await api.get('/market/brvm/tools/commodities'); setComm(r.data) }
      if (t === 'africa'      && !africa.length)      { const r = await api.get('/market/brvm/tools/africa');      setAfrica(r.data) }
      if (t === 'macro'       && !macro)               { const r = await api.get('/market/brvm/tools/macro');       setMacro(r.data) }
      if (t === 'governance'  && !governance.length)  { const r = await api.get('/market/brvm/tools/governance');  setGov(r.data) }
    } catch { toast.error('Erreur de chargement') }
    finally { setLoadingTab(false) }
  }, [liquidity.length, dividends.length, commodities.length, africa.length, macro, governance.length])

  useEffect(() => { loadCore() }, [loadCore])
  useEffect(() => { loadTab(tab) }, [tab, loadTab])

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

  const handleSort = (k:string) => { if(k===sortKey)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortKey(k);setSortDir('desc')} }
  const [debouncedSearch] = useDebounceValue(search, 250)
  const tableParentRef  = useRef<HTMLDivElement>(null)
  const rowVirtualizer  = useVirtualizer({
    count:           filtered.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize:    () => 48,
    overscan:        8,
  })

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

  /* ── Render helper ────────────────────────────────────── */
  const Skeleton = ({ n=6 }:{n?:number}) => (
    <div className="space-y-3">
      {Array.from({length:n}).map((_,i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" style={{opacity:1-i*0.12}}/>
      ))}
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Globe size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">BRVM</h1>
            <p className="text-sm text-gray-500">Bourse Régionale des Valeurs Mobilières — UEMOA</p>
          </div>
          <div className="flex gap-1 ml-2">
            {['🇨🇮','🇸🇳','🇧🇫','🇧🇯','🇲🇱','🇳🇪','🇹🇬','🇬🇼'].map(f=><span key={f} className="text-lg">{f}</span>)}
          </div>
        </div>
        <button onClick={loadCore} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={cn(loading&&'animate-spin')}/>
          Actualiser
        </button>
      </div>

      {/* KPIs avec CountUp ──────────────────────────────── */}
      {market && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <KPICounter value={Math.round((market.totalMarketCap??0)/1e9)} suffix=" Md XOF" label="Capitalisation totale" sub={`${quotes.filter(q=>q.price>0).length} sociétés cotées`} color="text-blue-700"/>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 font-medium">Séance du jour</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black text-green-600"><CountUpSafe end={market.advancers}/></span>
              <span className="text-gray-300">/</span>
              <span className="text-xl font-black text-red-600"><CountUpSafe end={market.decliners}/></span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{market.unchanged} inchangés</p>
          </Card>
          <Card className="p-4">
            <KPICounter value={market.totalVolume} label="Volume total (titres)" sub="Échangés ce jour" color="text-purple-700"/>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 font-medium">Séance</p>
            <p className="text-base font-black text-gray-900 mt-0.5">{market.date}</p>
            <p className="text-xs text-gray-400 mt-0.5">Données fin de journée</p>
          </Card>
        </div>
      )}

      {/* Indices ────────────────────────────────────────── */}
      {market?.indices && (
        <div className="grid grid-cols-2 gap-4">
          {market.indices.map(idx => (
            <Card key={idx.name} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">{idx.name}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{idx.value.toFixed(2)}</p>
                </div>
                <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold',
                  idx.changePercent>=0?'bg-green-50 text-green-700':'bg-red-50 text-red-700')}>
                  {idx.changePercent>=0?<TrendingUp size={14}/>:<TrendingDown size={14}/>}
                  {idx.changePercent>=0?'+':''}{idx.changePercent.toFixed(2)}%
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100">
                <div className={cn('h-full rounded-full',idx.changePercent>=0?'bg-green-500':'bg-red-400')}
                  style={{width:`${Math.min(Math.abs(idx.changePercent)*15,100)}%`}}/>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab groups ─────────────────────────────────────── */}
      <div className="space-y-1">
        {TAB_GROUPS.map(group => (
          <div key={group.label} className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wide w-28">{group.label}</span>
            <div className="flex gap-1 flex-wrap">
              {group.tabs.map(({key,label,Icon})=>(
                <button key={key} onClick={()=>setTab(key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tab===key?'bg-blue-600 text-white shadow-sm':'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700')}>
                  <Icon size={12}/>{label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ════ TAB CONTENT ════════════════════════════════ */}
      <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.2}}>

        {/* ── Vue marché ── */}
        {tab==='overview' && market && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><TrendingUp size={15} className="text-green-600"/><h3 className="font-bold text-gray-900">Top Hausses</h3></div>
                <div className="space-y-3">
                  {market.topGainers.map(q=>(
                    <div key={q.symbol} className="flex items-center justify-between">
                      <div><span className="font-bold text-sm text-blue-700">{q.symbol}</span><span className="text-xs text-gray-400 ml-2">{q.name}</span></div>
                      <div className="text-right"><p className="text-sm font-bold text-gray-900">{q.price>0?q.price.toLocaleString('fr-FR'):'-'}</p><p className="text-xs font-bold text-green-600">+{q.changePercent.toFixed(2)}%</p></div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><TrendingDown size={15} className="text-red-600"/><h3 className="font-bold text-gray-900">Top Baisses</h3></div>
                <div className="space-y-3">
                  {market.topLosers.map(q=>(
                    <div key={q.symbol} className="flex items-center justify-between">
                      <div><span className="font-bold text-sm text-blue-700">{q.symbol}</span><span className="text-xs text-gray-400 ml-2">{q.name}</span></div>
                      <div className="text-right"><p className="text-sm font-bold text-gray-900">{q.price>0?q.price.toLocaleString('fr-FR'):'-'}</p><p className="text-xs font-bold text-red-600">{q.changePercent.toFixed(2)}%</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 mb-3">Breadth du marché BRVM</h3>
              <div className="flex gap-3 items-center">
                <div className="flex-1 h-4 rounded-full overflow-hidden bg-gray-100 flex">
                  <div className="bg-green-500 h-full" style={{width:`${market.advancers/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                  <div className="bg-gray-300 h-full" style={{width:`${market.unchanged/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                  <div className="bg-red-400 h-full" style={{width:`${market.decliners/(market.advancers+market.decliners+market.unchanged||1)*100}%`}}/>
                </div>
              </div>
              <div className="flex gap-6 mt-2 text-sm">
                <span><span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1.5"/><b className="text-green-700">{market.advancers}</b> <span className="text-gray-500">hausses</span></span>
                <span><span className="w-2 h-2 rounded-full bg-gray-300 inline-block mr-1.5"/><b className="text-gray-700">{market.unchanged}</b> <span className="text-gray-500">stables</span></span>
                <span><span className="w-2 h-2 rounded-full bg-red-400 inline-block mr-1.5"/><b className="text-red-700">{market.decliners}</b> <span className="text-gray-500">baisses</span></span>
              </div>
            </Card>
          </div>
        )}

        {/* ── Cotations ── */}
        {tab==='quotes' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"/></div>
              <select value={filterSector} onChange={e=>setFilterSector(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tous secteurs</option>{sectors.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tous pays</option>{countries.map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]??''} {c}</option>)}
              </select>
              <span className="text-sm text-gray-400 self-center">{filtered.length} titre{filtered.length>1?'s':''}</span>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {[['symbol','Symbole'],['name','Société'],['price','Cours (XOF)'],['changePercent','%'],['volume','Volume'],['marketCap','Capitalisation'],['sector','Secteur'],['country','Pays']].map(([k,l])=>(
                        <th key={k} onClick={()=>handleSort(k)} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap select-none">
                          <span className="flex items-center gap-1">{l}{sortKey===k?(sortDir==='desc'?<ChevronDown size={11}/>:<ChevronUp size={11}/>):null}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
                {/* Table body virtualisée */}
                <div ref={tableParentRef} className="overflow-y-auto" style={{maxHeight:'480px'}}>
                  {loading ? (
                    <table className="w-full text-sm"><tbody className="divide-y divide-gray-50">
                      {Array.from({length:8}).map((_,i)=>(
                        <tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}</tr>
                      ))}
                    </tbody></table>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody style={{height:`${rowVirtualizer.getTotalSize()}px`,position:'relative'}}>
                        {rowVirtualizer.getVirtualItems().map(vRow => {
                          const q = filtered[vRow.index]
                          return (
                            <tr key={q.symbol} data-index={vRow.index}
                              style={{position:'absolute',top:0,left:0,width:'100%',height:`${vRow.size}px`,transform:`translateY(${vRow.start}px)`}}
                              className="hover:bg-gray-50 border-b border-gray-50">
                              <td className="px-4 py-3 font-bold text-blue-700 w-20">{q.symbol}</td>
                              <td className="px-4 py-3 text-gray-900 max-w-44 truncate">{q.name}</td>
                              <td className="px-4 py-3 font-mono font-bold text-gray-900">{q.price>0?q.price.toLocaleString('fr-FR'):'—'}</td>
                              <td className={cn('px-4 py-3 font-bold',q.changePercent>0?'text-green-600':q.changePercent<0?'text-red-600':'text-gray-400')}>{q.changePercent>0?'+':''}{q.changePercent.toFixed(2)}%</td>
                              <td className="px-4 py-3 text-gray-600">{fmtVol(q.volume)}</td>
                              <td className="px-4 py-3 text-gray-600">{fmtXOF(q.marketCap)}</td>
                              <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',SECTOR_COLORS[q.sector]??'bg-gray-100 text-gray-600')}>{q.sector}</span></td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{COUNTRY_FLAGS[q.country]??''} {q.country}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Secteurs ── */}
        {tab==='sectors' && market && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 mb-3">Capitalisation par secteur</h3>
                <SectorPieChart sectors={market.sectors} />
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {market.sectors.map(s=>(
                  <Card key={s.sector} className="p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold',SECTOR_COLORS[s.sector]??'bg-gray-100 text-gray-600')}>{s.sector}</span>
                      <span className={cn('text-sm font-bold',s.avgChange>0?'text-green-600':s.avgChange<0?'text-red-600':'text-gray-400')}>{s.avgChange>0?'+':''}{s.avgChange.toFixed(2)}%</span>
                    </div>
                    <p className="text-sm font-black text-gray-900">{fmtXOF(s.marketCap)}</p>
                    <p className="text-xs text-gray-400">{s.stockCount} sociétés</p>
                    <div className="flex gap-3 mt-1.5 text-xs"><span className="text-green-600">▲{s.advancers}</span><span className="text-gray-400">—{s.unchanged}</span><span className="text-red-600">▼{s.decliners}</span></div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Pays ── */}
        {tab==='countries' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[["Côte d'Ivoire",'Hub financier régional'],['Sénégal','Pétrole offshore + telecom'],['Burkina Faso','Mines + telecom'],['Bénin','Logistique portuaire'],['Mali','Banque'],['Niger','Ressources naturelles'],['Togo','Finance + Ecobank TI'],['Guinée-Bissau','Économie émergente']].map(([country,desc])=>{
              const qs = quotes.filter(q=>q.country===country)
              const mktCap = qs.reduce((s,q)=>s+(q.marketCap??0),0)
              return (
                <Card key={country} className="p-5">
                  <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{COUNTRY_FLAGS[country]??'🌍'}</span><div><p className="font-bold text-sm text-gray-900">{country}</p><p className="text-xs text-gray-400">{desc}</p></div></div>
                  <p className="text-2xl font-black text-blue-700">{qs.length}</p>
                  <p className="text-xs text-gray-400 mb-1">société{qs.length>1?'s':''} cotée{qs.length>1?'s':''}</p>
                  <p className="text-xs font-semibold text-gray-600">{fmtXOF(mktCap)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{qs.slice(0,4).map(q=><span key={q.symbol} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-mono rounded">{q.symbol}</span>)}{qs.length>4&&<span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">+{qs.length-4}</span>}</div>
                </Card>
              )
            })}
          </div>
        )}

        {/* ═══ OUTIL 1 — LIQUIDITÉ ══════════════════════ */}
        {tab==='liquidity' && (
          <div className="space-y-5">
            <Card className="p-5 bg-blue-50 border-blue-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-blue-900">Analyseur de Liquidité — Méthode Amihud (2002)</p><p className="text-xs text-blue-700 mt-1">Le ratio d'Amihud mesure l'impact de prix par franc échangé. Une fréquence de cotation élevée et un fort volume réduisent le risque de ne pas pouvoir sortir d'une position. Les DtL indiquent le nombre de jours pour liquider 1M XOF en ne représentant pas plus de 30% du volume journalier (règle institutionnelle).</p><p className="text-xs text-blue-500 mt-1">Source : Amihud (2002) Journal of Financial Markets ; Koné & Traoré (2019) AERC Research Paper</p></div></div>
            </Card>
            {loadingTab ? <Skeleton n={8}/> : (
              <>
                <div className="grid grid-cols-5 gap-3">
                  {(['Très liquide','Liquide','Modéré','Illiquide','Très illiquide'] as const).map(cat=>{
                    const n = liquidity.filter(l=>l.category===cat).length
                    const colors = {['Très liquide']:'bg-green-100 text-green-700',['Liquide']:'bg-blue-100 text-blue-700',['Modéré']:'bg-yellow-100 text-yellow-700',['Illiquide']:'bg-orange-100 text-orange-700',['Très illiquide']:'bg-red-100 text-red-700'}
                    return <Card key={cat} className="p-3 text-center"><p className={cn('text-2xl font-black',colors[cat].split(' ')[1])}>{n}</p><p className={cn('text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full',colors[cat])}>{cat}</p></Card>
                  })}
                </div>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">{[['Rang',''],['Symbole',''],['Score','liquidityScore'],['Catégorie',''],['Fréq. cotation','tradingFreq'],['Vol. moy 30j','avgVolume30d'],['DtL (1M XOF)','dtlEstimateDays'],['Secteur','sector']].map(([l,k])=><th key={l} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{l}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {liquidity.map((l,i)=>{
                          const catColors: Record<string,string> = {'Très liquide':'bg-green-100 text-green-700','Liquide':'bg-blue-100 text-blue-700','Modéré':'bg-yellow-100 text-yellow-700','Illiquide':'bg-orange-100 text-orange-700','Très illiquide':'bg-red-100 text-red-700'}
                          return (
                            <tr key={l.symbol} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i+1}</td>
                              <td className="px-4 py-3"><span className="font-bold text-blue-700">{l.symbol}</span>{l.isInBRVM10&&<span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-bold">BRVM10</span>}</td>
                              <td className="px-4 py-3">
                                <ScoreGauge value={l.liquidityScore} size={44} />
                              </td>
                              <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',catColors[l.category]??'bg-gray-100 text-gray-600')}>{l.category}</span></td>
                              <td className="px-4 py-3 font-mono text-sm">{l.tradingFreq}%</td>
                              <td className="px-4 py-3 text-gray-600 text-sm">{fmtXOF(l.avgVolume30d)}</td>
                              <td className={cn('px-4 py-3 text-sm font-semibold',l.dtlEstimateDays<=3?'text-green-600':l.dtlEstimateDays<=10?'text-yellow-600':'text-red-600')}>{l.dtlEstimateDays>=999?'>1 an':`${l.dtlEstimateDays}j`}</td>
                              <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',SECTOR_COLORS[l.sector]??'bg-gray-100 text-gray-600')}>{l.sector}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ═══ OUTIL 2 — DIVIDENDES ═════════════════════ */}
        {tab==='dividends' && (
          <div className="space-y-5">
            <Card className="p-5 bg-green-50 border-green-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-green-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-green-900">Screener Dividendes — Modèle Gordon-Shapiro</p><p className="text-xs text-green-700 mt-1">Le rendement moyen BRVM se situe entre 4,2% et 6,8% historiquement, contre 1,5-2% pour le CAC 40. La Valeur Gordon est calculée via <i>P = D₁/(k−g)</i> avec k=10% (coût des fonds propres UEMOA, prime de risque Africa incluse) et g = taux de croissance historique du dividende. Un cours inférieur à la valeur Gordon signale une sous-valorisation.</p><p className="text-xs text-green-500 mt-1">Source : Gordon & Shapiro (1956) ; CGF Bourse Research Notes 2023 ; NSIA Finance</p></div></div>
            </Card>
            {loadingTab ? <Skeleton n={8}/> : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {label:'Rendement moyen', value:`${(dividends.filter(d=>d.currentYield>0).reduce((s,d)=>s+d.currentYield,0)/(dividends.filter(d=>d.currentYield>0).length||1)).toFixed(2)}%`, sub:'Titres avec dividende'},
                    {label:'Qualifiés (3 ans+)', value:dividends.filter(d=>d.qualified).length, sub:'Dividende ≥3 ans consécutifs'},
                    {label:'Meilleur rendement', value:dividends[0]?`${dividends[0].symbol} (${dividends[0].currentYield.toFixed(2)}%)`:'-', sub:'Top dividende BRVM'},
                    {label:'Rendement médian', value:`${(dividends.filter(d=>d.currentYield>0).sort((a,b)=>a.currentYield-b.currentYield)[Math.floor(dividends.filter(d=>d.currentYield>0).length/2)]?.currentYield??0).toFixed(2)}%`, sub:'Médiane du marché'},
                  ].map(({label,value,sub})=>(
                    <Card key={label} className="p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-black text-gray-900 mt-0.5">{value}</p><p className="text-xs text-gray-400 mt-0.5">{sub}</p></Card>
                  ))}
                </div>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">{['Symbole','Société','Cours (XOF)','Dernier div.','Rendement','Taux distr.','Régularité','Valeur Gordon','Signal','Secteur'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {dividends.filter(d=>d.lastDividend>0).map(d=>{
                          const gordonSignal = d.gordonFairValue&&d.currentPrice>0 ? (d.currentPrice<d.gordonFairValue*0.9?'Sous-valorisé':d.currentPrice>d.gordonFairValue*1.1?'Sur-valorisé':'Juste valeur') : null
                          return (
                            <tr key={d.symbol} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-bold text-blue-700">{d.symbol}</td>
                              <td className="px-4 py-3 text-gray-900 max-w-40 truncate">{d.name}</td>
                              <td className="px-4 py-3 font-mono text-sm">{d.currentPrice>0?d.currentPrice.toLocaleString('fr-FR'):'—'}</td>
                              <td className="px-4 py-3 font-mono text-sm text-gray-700">{d.lastDividend.toLocaleString('fr-FR')}</td>
                              <td className="px-4 py-3">
                                <span className={cn('font-bold',d.currentYield>=6?'text-green-700':d.currentYield>=4?'text-green-600':d.currentYield>=2?'text-yellow-600':'text-gray-500')}>
                                  {d.currentYield>0?`${d.currentYield.toFixed(2)}%`:'—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{d.payoutRatio?`${d.payoutRatio}%`:'—'}</td>
                              <td className="px-4 py-3">
                                <div className="w-28"><DividendBarChart history={d.history.slice(0,4)} height={36}/></div>
                                <span className="text-xs text-gray-400">{d.consistency} an{d.consistency>1?'s':''}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-sm">{d.gordonFairValue?d.gordonFairValue.toLocaleString('fr-FR'):'—'}</td>
                              <td className="px-4 py-3">
                                {gordonSignal && <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',gordonSignal==='Sous-valorisé'?'bg-green-100 text-green-700':gordonSignal==='Sur-valorisé'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600')}>{gordonSignal}</span>}
                              </td>
                              <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',SECTOR_COLORS[d.sector]??'bg-gray-100 text-gray-600')}>{d.sector}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ═══ OUTIL 3 — MATIÈRES PREMIÈRES ════════════ */}
        {tab==='commodities' && (
          <div className="space-y-5">
            <Card className="p-5 bg-amber-50 border-amber-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-amber-900">Corrélation Matières Premières — Pearson 90 jours</p><p className="text-xs text-amber-700 mt-1">Les actions agricoles et pétrolières de la BRVM sont corrélées aux prix des matières premières internationales (ICE Futures, CME Group). Une corrélation &gt;0,6 = forte liaison. Un signal de "divergence" apparaît quand le cours de l'action s'est écarté de +/-10% de sa matière première de référence sur l'année en cours.</p><p className="text-xs text-amber-500 mt-1">Sources : Yahoo Finance (prix commodity temps réel) ; Ezzahid & Elouaourti (2020)</p></div></div>
            </Card>
            {loadingTab ? <Skeleton n={6}/> : commodities.length===0 ? (
              <Card className="p-12 text-center text-gray-400">Calcul des corrélations en cours… (données Yahoo Finance)</Card>
            ) : (
              <>
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 mb-4">Corrélations 90 jours — vue d'ensemble</h3>
                <CorrelationHeatmap correlations={commodities.filter(c=>c.correlation90d!==0)} />
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {commodities.map(c=>(
                  <Card key={c.symbol} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div><p className="font-bold text-gray-900">{c.symbol} <span className="text-gray-400 font-normal text-sm">— {c.name}</span></p><p className="text-xs text-gray-500 mt-0.5">vs <b>{c.primaryCommodity}</b></p></div>
                      <span className={cn('px-2.5 py-1 rounded-xl text-xs font-bold',c.signal==='Sous-valorisé'?'bg-green-100 text-green-700':c.signal==='Sur-valorisé'?'bg-red-100 text-red-700':c.signal==='Non calculé'?'bg-gray-100 text-gray-500':'bg-blue-100 text-blue-700')}>{c.signal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="text-center"><p className="text-xs text-gray-400">Corrél. 90j</p><p className={cn('text-lg font-black',corrColor(c.correlation90d))}>{c.correlation90d===0?'N/A':c.correlation90d.toFixed(2)}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Corrél. 30j</p><p className={cn('text-lg font-black',corrColor(c.correlation30d))}>{c.correlation30d===0?'N/A':c.correlation30d.toFixed(2)}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Divergence YTD</p><p className={cn('text-lg font-black',c.divergence>0?'text-red-600':'text-green-600')}>{c.divergence===0?'N/A':`${c.divergence>0?'+':''}${c.divergence}%`}</p></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg p-2">{c.interpretation}</p>
                    <div className="flex items-center justify-between mt-2"><span className="text-xs text-gray-400">Fiabilité : <b>{c.confidence}</b></span></div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* ═══ OUTIL 4 — COMPARATEUR AFRIQUE ═══════════ */}
        {tab==='africa' && (
          <div className="space-y-5">
            <Card className="p-5 bg-purple-50 border-purple-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-purple-900">Comparateur Bourses Africaines</p><p className="text-xs text-purple-700 mt-1">La BRVM représente ~14,5 Mds USD de capitalisation sur les ~1 400 Mds USD des bourses africaines. Sa singularité : devise ancrée à l'euro (0% risque XOF/EUR), faible corrélation avec les marchés développés, rendement dividende élevé.</p><p className="text-xs text-purple-500 mt-1">Sources : ASEA Annual Statistics 2023 ; FMI WEO Oct 2024 ; Banque Mondiale GFDD 2024</p></div></div>
            </Card>
            {loadingTab ? <Skeleton n={6}/> : (
              <>
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 mb-4">Radar de comparaison — métriques normalisées</h3>
                <AfricaRadarChart markets={africa} />
                <p className="text-xs text-gray-400 text-center mt-2">P/E attractif = P/E bas vs pairs ; Rdt div. = rendement dividende ; Perf. YTD = performance sur l'année</p>
              </Card>
              <div className="space-y-4">
                {africa.map(m=>(
                  <Card key={m.market} className={cn('p-5',m.market==='BRVM'&&'border-2 border-green-300 bg-green-50/30')}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-black text-gray-900">{m.market}</span>
                          {m.market==='BRVM'&&<span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Notre marché</span>}
                          <span className="text-sm text-gray-500">{m.country}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500 font-mono">{m.currency}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{m.indexName}</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{m.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">{m.mainSectors.map(s=><span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{s}</span>)}</div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
                        {[
                          {label:'P/E',value:m.peRatio?`${m.peRatio}x`:'—'},
                          {label:'Rdt div.',value:m.dividendYield?`${m.dividendYield}%`:'—'},
                          {label:'Perf. YTD',value:m.ytdReturn!=null?`${m.ytdReturn>0?'+':''}${m.ytdReturn}%`:'—'},
                          {label:'Mkt Cap',value:m.marketCapUSD?`$${m.marketCapUSD>=1000?(m.marketCapUSD/1000).toFixed(0)+'B':m.marketCapUSD+'M'}`:'—'},
                        ].map(({label,value})=>(
                          <div key={label} className="text-center bg-white rounded-xl p-2.5 border border-gray-100">
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-sm font-black text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 italic">{m.source}</p>
                  </Card>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* ═══ OUTIL 5 — MACRO UEMOA ════════════════════ */}
        {tab==='macro' && macro && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {label:'Taux BCEAO', value:`${macro.bceaoRate}%`, color:'text-blue-700', bg:'bg-blue-50', sub:'Taux directeur'},
                {label:'Inflation UEMOA', value:`${macro.inflation}%`, color:'text-orange-700', bg:'bg-orange-50', sub:'Indice général'},
                {label:'Croissance PIB', value:`${macro.gdpGrowth}%`, color:'text-green-700', bg:'bg-green-50', sub:'Zone UEMOA 2024'},
                {label:'Mise à jour', value:macro.lastUpdated, color:'text-gray-700', bg:'bg-gray-50', sub:'Source FMI/BCEAO'},
              ].map(({label,value,color,bg,sub})=>(
                <Card key={label} className={cn('p-4',bg,'border')}>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className={cn('text-2xl font-black mt-1',color)}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              {macro.indicators.map(ind=>(
                <Card key={ind.name} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('w-2 h-2 rounded-full',ind.impact==='positif'?'bg-green-500':ind.impact==='négatif'?'bg-red-500':'bg-gray-400')}/>
                        <p className="font-bold text-gray-900 text-sm">{ind.name}</p>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',ind.impact==='positif'?'bg-green-100 text-green-700':ind.impact==='négatif'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600')}>{ind.impact}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{ind.description}</p>
                      <p className="text-xs text-gray-400 mt-1 italic">{ind.source}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-gray-900">{ind.value.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-400">{ind.unit}</span></p>
                      <p className={cn('text-xs font-semibold',ind.trend==='hausse'?'text-red-500':ind.trend==='baisse'?'text-green-500':'text-gray-400')}>
                        {ind.trend==='hausse'?'↑':ind.trend==='baisse'?'↓':'→'} vs {ind.previousYear.toLocaleString('fr-FR')} {ind.unit} (N-1)
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Wheat size={15} className="text-amber-600"/>Matières premières clés</h3>
                <div className="space-y-2">
                  {macro.commodityLinks.map(c=>(
                    <div key={c.commodity} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex-1"><p className="text-sm font-bold text-gray-900">{c.commodity} — <span className="text-green-700">{c.price}</span></p><p className="text-xs text-gray-500 mt-0.5">{c.relevance}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-orange-500"/>Risques principaux</h3>
                <div className="space-y-2">
                  {macro.risks.map(r=>(
                    <div key={r.label} className="p-2.5 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('px-2 py-0.5 text-xs font-bold rounded-full',r.level==='Élevé'?'bg-red-100 text-red-700':r.level==='Modéré'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700')}>{r.level}</span>
                        <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                      </div>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
        {tab==='macro' && !macro && loadingTab && <Skeleton n={8}/>}

        {/* ═══ OUTIL 6 — GOUVERNANCE ════════════════════ */}
        {tab==='governance' && (
          <div className="space-y-5">
            <Card className="p-5 bg-indigo-50 border-indigo-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-indigo-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-indigo-900">Score de Gouvernance — Méthode composite</p><p className="text-xs text-indigo-700 mt-1">Score sur 100 : Auditeur (25pts — Big 4 = prime documentée) + Transparence (25pts — float + cross-listing) + Régularité dividende (25pts) + Qualité actionnariat (25pts). Méthode inspirée de Watts & Zimmerman (1986) adapée aux standards UEMOA (SYSCOHADA).</p></div></div>
            </Card>
            {loadingTab ? <Skeleton n={8}/> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {governance.map(g=>(
                  <Card key={g.symbol} className={cn('p-5 border',scoreBg(g.totalScore))}>
                    <div className="mb-3">
                      <p className="font-black text-gray-900">{g.symbol} <span className="font-normal text-gray-500 text-sm">— {g.name}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.auditor}{g.parentCompany&&` • ${g.parentCompany}`}</p>
                    </div>
                    <GovernanceGauge total={g.totalScore} audit={g.auditScore} transparency={g.transparencyScore} dividend={g.dividendScore} parent={g.parentScore}/>
                    {(g.strengths.length>0||g.warnings.length>0)&&(
                      <div className="mt-3 space-y-0.5">
                        {g.strengths.map(s=><div key={s} className="flex items-center gap-1.5 text-xs text-green-700"><CheckCircle size={10}/>{s}</div>)}
                        {g.warnings.map(w=><div key={w} className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle size={10}/>{w}</div>)}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ OUTIL 7 — SIMULATEUR COÛT ═══════════════ */}
        {tab==='cost' && (
          <div className="space-y-5">
            <Card className="p-5 bg-teal-50 border-teal-100">
              <div className="flex items-start gap-3"><Info size={16} className="text-teal-600 mt-0.5 flex-shrink-0"/><div><p className="text-sm font-bold text-teal-900">Simulateur de Coût de Transaction — Barème CREPMF 2024</p><p className="text-xs text-teal-700 mt-1">Les frais de courtage BRVM (0,60% SGI + 0,15% BRVM + 0,03% CREPMF + 0,02% Dépositaire) sont parmi les plus élevés d'Afrique. Sur un aller-retour, le rendement net minimum pour être à l'équilibre est indiqué par le "Seuil de rentabilité".</p><p className="text-xs text-teal-500 mt-1">Source : Barème CREPMF 2024 ; Codes Généraux des Impôts UEMOA</p></div></div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Paramètres de la transaction</h3>
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Montant (XOF)</label><input type="number" value={costForm.amount} onChange={e=>setCostForm(f=>({...f,amount:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Type</label>
                    <div className="flex gap-2">
                      {['buy','sell'].map(t=><button key={t} onClick={()=>setCostForm(f=>({...f,type:t}))} className={cn('flex-1 py-2 text-sm font-semibold rounded-xl transition-all',costForm.type===t?t==='buy'?'bg-green-600 text-white':'bg-red-600 text-white':'border border-gray-200 text-gray-600 hover:bg-gray-50')}>{t==='buy'?'Achat':'Vente'}</button>)}
                    </div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Pays de résidence</label>
                    <select value={costForm.country} onChange={e=>setCostForm(f=>({...f,country:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {[['CI',"🇨🇮 Côte d'Ivoire (15%)"],['SN','🇸🇳 Sénégal (10%)'],['BF','🇧🇫 Burkina Faso (12,5%)'],['BJ','🇧🇯 Bénin (10%)'],['ML','🇲🇱 Mali (10%)'],['NE','🇳🇪 Niger (10%)'],['TG','🇹🇬 Togo (10%)'],['GW','🇬🇼 Guinée-Bissau (10%)']].map(([k,l])=><option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3"><input type="checkbox" checked={costForm.includeTax} onChange={e=>setCostForm(f=>({...f,includeTax:e.target.checked}))} className="w-4 h-4 rounded text-blue-600"/><label className="text-sm text-gray-700">Inclure retenue à la source dividendes</label></div>
                  {costForm.includeTax&&<div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Montant dividende (XOF)</label><input type="number" value={costForm.dividendAmount} onChange={e=>setCostForm(f=>({...f,dividendAmount:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 11500 pour SONATEL"/></div>}
                  <button onClick={runCostSimulator} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">Calculer les frais</button>
                </div>
              </Card>
              {costResult && (
                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Résultat de la simulation</h3>
                  <div className="space-y-3">
                    {[
                      {label:'Montant brut',value:`${costResult.grossAmount.toLocaleString('fr-FR')} XOF`,cls:'text-gray-900'},
                      {label:'Commission SGI (0,60%)',value:`- ${costResult.brokerFee.toLocaleString('fr-FR')} XOF`,cls:'text-red-600'},
                      {label:'Frais BRVM (0,15%)',value:`- ${costResult.brvmFee.toLocaleString('fr-FR')} XOF`,cls:'text-red-600'},
                      {label:'Frais CREPMF (0,03%)',value:`- ${costResult.crepmfFee.toLocaleString('fr-FR')} XOF`,cls:'text-red-600'},
                      {label:'Dépositaire central (0,02%)',value:`- ${costResult.csdFee.toLocaleString('fr-FR')} XOF`,cls:'text-red-600'},
                      ...(costResult.withholdingTax?[{label:'Retenue à la source dividendes',value:`- ${costResult.withholdingTax.toLocaleString('fr-FR')} XOF`,cls:'text-orange-600'}]:[]),
                    ].map(({label,value,cls})=>(
                      <div key={label} className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-sm text-gray-600">{label}</span><span className={cn('text-sm font-bold',cls)}>{value}</span></div>
                    ))}
                    <div className="flex justify-between py-2 bg-gray-50 rounded-xl px-3 mt-2">
                      <span className="font-bold text-gray-900">Total frais</span>
                      <span className="font-black text-red-700">- {costResult.totalFees.toLocaleString('fr-FR')} XOF ({costResult.totalFeePct}%)</span>
                    </div>
                    <div className="flex justify-between py-2 bg-blue-50 rounded-xl px-3">
                      <span className="font-bold text-blue-900">{costForm.type==='buy'?'Montant total déboursé':'Montant net reçu'}</span>
                      <span className="font-black text-blue-700">{costResult.netAmount.toLocaleString('fr-FR')} XOF</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">Seuil de rentabilité (aller-retour)</p>
                      <p className="text-lg font-black text-amber-700 mt-0.5">{costResult.breakEvenYield}% de rendement minimum</p>
                      <p className="text-xs text-amber-600 mt-0.5">Le dividende ou la plus-value doit dépasser {costResult.breakEvenYield}% pour couvrir les frais d'un aller-retour.</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}
