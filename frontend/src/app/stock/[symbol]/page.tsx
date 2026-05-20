'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Star, StarOff, Globe, Users,
  Building2, Calendar, ArrowLeft, ExternalLink,
  DollarSign, BarChart3, Newspaper, FileText, Save, Check,
  ChevronRight, Activity, LineChart,
} from 'lucide-react'
import api from '@/lib/api'
import { cn, formatPct } from '@/lib/utils'
import { fmtPrice, fmtBigNumber, fmtPercent } from '@/lib/finance'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import dynamic from 'next/dynamic'

const TradingChart       = dynamic(() => import('@/components/charts/TradingChart'),       { ssr: false })
const RSIPanel           = dynamic(() => import('@/components/charts/RSIPanel'),           { ssr: false })
const TechnicalIndicators = dynamic(() => import('@/components/charts/TechnicalIndicators'), { ssr: false })
import { Progress } from '@/components/ui/Progress'
import { PageLoader } from '@/components/ui/Spinner'
import { toast } from 'sonner'

interface Profile {
  symbol: string; name: string; price: number; change: number; changePercent: number
  sector?: string; industry?: string; description?: string; website?: string
  employees?: number; country?: string; marketCap?: number; pe?: number
  forwardPE?: number; eps?: number; beta?: number; dividendYield?: number
  week52High?: number; week52Low?: number; revenue?: number
  grossMargin?: number; operatingMargin?: number
  revenueGrowth?: number; earningsGrowth?: number
  nextEarningsDate?: string; currency: string
}
interface HistPoint { date: string; close: number; volume: number }
interface NewsItem   { title: string; publisher: string; link: string; publishedAt: string; thumbnail?: string }

const PERIODS = ['5d','1mo','3mo','6mo','1y','5y'] as const
type Period = typeof PERIODS[number]
type Tab = 'overview' | 'financials' | 'news' | 'technical'

function fmtBig(n?: number) { return fmtBigNumber(n) }
function fmt(n?: number, d = 2) { return n != null ? n.toFixed(d) : '—' }

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className="text-white font-bold">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function StockProfilePage() {
  const { symbol }  = useParams<{ symbol: string }>()
  const router      = useRouter()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [history, setHistory]       = useState<HistPoint[]>([])
  const [news, setNews]             = useState<NewsItem[]>([])
  const [period, setPeriod]         = useState<Period>('1mo')
  const [note, setNote]             = useState('')
  const [savedNote, setSavedNote]   = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [tab, setTab]               = useState<Tab>('overview')
  const [loading, setLoading]       = useState(true)
  const [expandDesc, setExpandDesc] = useState(false)

  const load = useCallback(async () => {
    const [p, h, n, wl, nt] = await Promise.allSettled([
      api.get(`/market/${symbol}/profile`),
      api.get(`/market/${symbol}/historical?period=${period}`),
      api.get(`/market/${symbol}/news`),
      api.get('/watchlist'),
      api.get(`/notes/${symbol}`),
    ])
    if (p.status  === 'fulfilled') setProfile(p.value.data)
    if (h.status  === 'fulfilled') setHistory(h.value.data)
    if (n.status  === 'fulfilled') setNews(n.value.data)
    if (wl.status === 'fulfilled') setInWatchlist(wl.value.data.some((w: any) => w.symbol === symbol.toUpperCase()))
    if (nt.status === 'fulfilled' && nt.value.data[0]) {
      setNote(nt.value.data[0].content); setSavedNote(nt.value.data[0].content)
    }
    setLoading(false)
  }, [symbol])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!symbol) return
    api.get(`/market/${symbol}/historical?period=${period}`).then(r => setHistory(r.data))
  }, [period])

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await api.delete(`/watchlist/${symbol}`)
      toast.success(`${symbol} retiré de la watchlist`)
    } else {
      await api.post('/watchlist', { symbol, companyName: profile?.name })
      toast.success(`${symbol} ajouté à la watchlist`)
    }
    setInWatchlist(v => !v)
  }

  const saveNote = async () => {
    setNoteSaving(true)
    await api.put(`/notes/${symbol}`, { content: note })
    setSavedNote(note)
    setNoteSaving(false)
    toast.success('Note enregistrée')
  }

  if (loading) return <PageLoader/>

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-zinc-600">
      <BarChart3 size={48} className="mb-4 opacity-20"/>
      <p className="font-semibold text-zinc-500">Données introuvables pour {symbol}</p>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-4">← Retour</Button>
    </div>
  )

  const w52pct = profile.week52High && profile.week52Low
    ? ((profile.price - profile.week52Low) / (profile.week52High - profile.week52Low)) * 100
    : 50
  const isUp        = profile.changePercent >= 0
  const maxVolume   = Math.max(...history.map(h => h.volume), 1)
  const chartColor  = isUp ? '#22c55e' : '#ef4444'

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id:'overview',   label:"Vue d'ensemble",    icon:<BarChart3  size={14}/> },
    { id:'financials', label:'Données financières', icon:<DollarSign size={14}/> },
    { id:'technical',  label:'Indicateurs',         icon:<LineChart  size={14}/> },
    { id:'news',       label:'Actualités',           icon:<Newspaper  size={14}/> },
  ]

  return (
    <div className="min-h-screen">

      {/* ── Back nav ────────────────────────────────── */}
      <div className="px-6 pt-5 pb-2">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14}/> Retour
        </button>
      </div>

      {/* ── Hero header ─────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
        className="px-6 pb-5 border-b border-white/[.05]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">

          {/* Left: name + price */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-xl font-black text-white">
                {profile.symbol[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-white">{profile.symbol}</h1>
                  {profile.sector && <Badge variant="blue" size="sm">{profile.sector}</Badge>}
                  {profile.country && <Badge variant="white" size="sm">{profile.country}</Badge>}
                </div>
                <p className="text-zinc-400 text-sm mt-0.5">{profile.name}</p>
              </div>
            </div>

            <div className="flex items-end gap-3 mt-4">
              <p className="text-4xl font-black text-white tabular-nums">${profile.price.toFixed(2)}</p>
              <div className={cn('flex items-center gap-1.5 pb-1', isUp ? 'text-green-400' : 'text-red-400')}>
                {isUp ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                <span className="text-lg font-bold tabular-nums">
                  {isUp?'+':''}{profile.change.toFixed(2)}
                </span>
                <Badge variant={isUp ? 'green' : 'red'}>
                  {isUp?'+':''}{profile.changePercent.toFixed(2)}%
                </Badge>
              </div>
            </div>

            {/* 52-week range */}
            <div className="mt-4 max-w-sm">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>52s bas <span className="text-white font-semibold">${fmt(profile.week52Low)}</span></span>
                <span className={cn('font-semibold text-xs px-2 py-0.5 rounded-full',
                  w52pct > 75 ? 'text-green-400 bg-green-500/10' :
                  w52pct < 25 ? 'text-red-400 bg-red-500/10' :
                                'text-yellow-400 bg-yellow-500/10')}>
                  {w52pct.toFixed(0)}% du range
                </span>
                <span>52s haut <span className="text-white font-semibold">${fmt(profile.week52High)}</span></span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                <motion.div className={cn('h-full rounded-full', isUp ? 'bg-green-500' : 'bg-red-500')}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, w52pct))}%` }}
                  transition={{ duration: .8, ease: [.22,1,.36,1] }}/>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex gap-2">
              <Button
                variant={inWatchlist ? 'gold' : 'outline'}
                leftIcon={inWatchlist ? <Star size={14} className="fill-current"/> : <StarOff size={14}/>}
                onClick={toggleWatchlist}>
                {inWatchlist ? 'Suivi' : 'Suivre'}
              </Button>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="md" leftIcon={<Globe size={14}/>}>Site web</Button>
                </a>
              )}
            </div>
            {profile.nextEarningsDate && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar size={12}/>
                Résultats le <span className="text-white font-semibold">{profile.nextEarningsDate}</span>
              </div>
            )}
            {profile.employees && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Users size={12}/>
                {profile.employees.toLocaleString('fr-FR')} employés
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="px-6 py-5 space-y-5">

        {/* ── Chart TradingView Lightweight ───────────── */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <Activity size={15} className={isUp ? 'text-green-500' : 'text-red-500'}/>
                Historique des prix
              </p>
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={cn('text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all',
                      period===p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <TradingChart data={history} symbol={symbol as string} height={280} showVolume/>
            {history.length > 30 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <RSIPanel closes={history.map(h=>h.close)} dates={history.map(h=>h.date)} height={80}/>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Tabs ────────────────────────────────────── */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.1 }}>
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all',
                  tab===t.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Tab content ─────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:.25 }}>

            {/* ── OVERVIEW ────────────────────────────── */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">

                  {/* Key metrics */}
                  <Card className="p-5">
                    <p className="font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 size={15} className="text-blue-400"/> Données clés
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label:'Capitalisation', value:fmtBig(profile.marketCap) },
                        { label:'P/E (ttm)',       value:fmt(profile.pe) },
                        { label:'P/E forward',     value:fmt(profile.forwardPE) },
                        { label:'BPA (ttm)',        value:profile.eps!=null?`$${fmt(profile.eps)}`:'—' },
                        { label:'Bêta',            value:fmt(profile.beta) },
                        { label:'Dividende',       value:profile.dividendYield!=null?`${fmt(profile.dividendYield)}%`:'—' },
                        { label:'Secteur',         value:profile.sector??'—' },
                        { label:'Industrie',       value:profile.industry??'—' },
                        { label:'Pays',            value:profile.country??'—' },
                        { label:'Employés',        value:profile.employees?.toLocaleString('fr-FR')??'—' },
                        { label:'Prochains résultats', value:profile.nextEarningsDate??'—',
                          color: profile.nextEarningsDate ? 'text-purple-400' : undefined },
                        { label:'Revenus',         value:fmtBig(profile.revenue) },
                      ].map(({ label, value, color }, i) => (
                        <motion.div key={label} initial={{ opacity:0 }} animate={{ opacity:1 }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-zinc-900/50 rounded-xl p-3 border border-white/[.04]">
                          <p className="text-zinc-500 text-xs mb-1">{label}</p>
                          <p className={cn('text-sm font-bold truncate', color ?? 'text-white')}>{value}</p>
                        </motion.div>
                      ))}
                    </div>
                  </Card>

                  {/* Description */}
                  {profile.description && (
                    <Card className="p-5">
                      <p className="font-bold text-white mb-3 flex items-center gap-2">
                        <Building2 size={15} className="text-zinc-400"/> À propos
                      </p>
                      <p className={cn('text-zinc-400 text-sm leading-relaxed', !expandDesc && 'line-clamp-4')}>
                        {profile.description}
                      </p>
                      <button onClick={() => setExpandDesc(v=>!v)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                        {expandDesc ? 'Voir moins' : 'Voir tout'}
                        <ChevronRight size={12} className={expandDesc ? 'rotate-90' : ''}/>
                      </button>
                    </Card>
                  )}
                </div>

                {/* Note personnelle */}
                <div>
                  <Card className="p-5 sticky top-5">
                    <p className="font-bold text-white mb-3 flex items-center gap-2">
                      <FileText size={15} className="text-yellow-400"/> Ma note
                    </p>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={`Vos analyses sur ${symbol}...\n\nEx: Objectif de prix, thèse d'investissement, risques identifiés...`}
                      rows={10}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-yellow-500/40 focus:ring-2 focus:ring-yellow-500/10 leading-relaxed font-mono"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-zinc-600 text-xs">{note.length} caractères</p>
                      <Button
                        variant={note === savedNote ? 'ghost' : 'gold'}
                        size="sm"
                        disabled={note === savedNote || noteSaving}
                        loading={noteSaving}
                        leftIcon={note === savedNote ? <Check size={12}/> : <Save size={12}/>}
                        onClick={saveNote}>
                        {note === savedNote ? 'Enregistré' : 'Sauvegarder'}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ── FINANCIALS ──────────────────────────── */}
            {tab === 'financials' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Revenue & growth */}
                  <Card className="p-5">
                    <p className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <TrendingUp size={13} className="text-green-400"/> Revenus & Croissance
                    </p>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-zinc-400 text-sm">Chiffre d'affaires</span>
                          <span className="text-white font-bold text-sm">{fmtBig(profile.revenue)}</span>
                        </div>
                      </div>
                      {[
                        { label:'Croissance CA',       value:profile.revenueGrowth,  suffix:'%' },
                        { label:'Croissance bénéfice', value:profile.earningsGrowth, suffix:'%' },
                      ].map(({ label, value, suffix }) => value != null ? (
                        <div key={label}>
                          <div className="flex justify-between mb-2">
                            <span className="text-zinc-400 text-sm">{label}</span>
                            <span className={cn('font-bold text-sm', value>=0?'text-green-400':'text-red-400')}>
                              {value>=0?'+':''}{value.toFixed(1)}{suffix}
                            </span>
                          </div>
                          <Progress
                            value={Math.abs(value)} max={50}
                            color={value>=0?'green':'red'} size="sm"
                          />
                        </div>
                      ) : null)}
                    </div>
                  </Card>

                  {/* Margins */}
                  <Card className="p-5">
                    <p className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <BarChart3 size={13} className="text-blue-400"/> Marges
                    </p>
                    <div className="space-y-4">
                      {[
                        { label:'Marge brute',         value:profile.grossMargin },
                        { label:'Marge opérationnelle', value:profile.operatingMargin },
                      ].map(({ label, value }) => value != null ? (
                        <div key={label}>
                          <div className="flex justify-between mb-2">
                            <span className="text-zinc-400 text-sm">{label}</span>
                            <span className={cn('font-bold text-sm', value>=0?'text-blue-400':'text-red-400')}>
                              {value.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={value} max={100} color={value>=50?'green':value>=20?'blue':'red'} size="md"/>
                        </div>
                      ) : null)}
                    </div>
                  </Card>
                </div>

                {/* Valuation */}
                <Card className="p-5">
                  <p className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <DollarSign size={13} className="text-yellow-400"/> Valorisation
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label:'P/E (ttm)',    value:profile.pe    ? `${profile.pe.toFixed(1)}x`    : '—', note:'Price / Earnings' },
                      { label:'P/E forward',  value:profile.forwardPE ? `${profile.forwardPE.toFixed(1)}x` : '—', note:'Forward earnings' },
                      { label:'BPA (ttm)',    value:profile.eps   ? `$${profile.eps.toFixed(2)}`   : '—', note:'Earnings per share' },
                      { label:'Dividende',   value:profile.dividendYield ? `${profile.dividendYield.toFixed(2)}%` : '—', note:'Yield annuel' },
                    ].map(({ label, value, note }) => (
                      <div key={label} className="bg-zinc-900/50 rounded-xl p-4 border border-white/[.04]">
                        <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
                        <p className="text-white font-black text-xl tabular-nums">{value}</p>
                        <p className="text-zinc-600 text-xs mt-1">{note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── TECHNICAL ───────────────────────────── */}
            {tab === 'technical' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-4">
                  {/* Chart avec indicateurs activés */}
                  <Card className="p-5">
                    <p className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <LineChart size={14} className="text-blue-500"/> Graphique avec indicateurs
                    </p>
                    <TradingChart
                      data={history} symbol={symbol as string} height={260}
                      showVolume showSMA showEMA showBollinger/>
                  </Card>
                  {/* RSI standalone */}
                  {history.length > 14 && (
                    <Card className="p-5">
                      <RSIPanel
                        closes={history.map(h => h.close)}
                        dates={history.map(h => h.date)}
                        height={120}/>
                    </Card>
                  )}
                </div>
                {/* Panneau indicateurs */}
                <Card className="p-5">
                  <p className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                    <Activity size={14} className="text-purple-500"/> Signaux
                  </p>
                  {history.length >= 20
                    ? <TechnicalIndicators data={history}/>
                    : <p className="text-gray-400 text-sm text-center py-8">
                        Pas assez de données (minimum 20 points).<br/>
                        Sélectionnez une période plus longue.
                      </p>
                  }
                </Card>
              </div>
            )}

            {/* ── NEWS ────────────────────────────────── */}
            {tab === 'news' && (
              <div className="space-y-3">
                {news.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                    <Newspaper size={40} className="mb-3 opacity-20"/>
                    <p className="font-medium text-zinc-500">Aucune actualité disponible</p>
                  </div>
                ) : news.map((item, i) => (
                  <motion.a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-4 bg-zinc-950 border border-white/[.05] rounded-2xl p-4 hover:border-white/10 hover:bg-white/[.02] transition-all group">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" onError={e => { (e.target as HTMLImageElement).style.display='none' }}
                        className="w-24 h-16 rounded-xl object-cover flex-shrink-0 bg-zinc-800"/>
                    ) : (
                      <div className="w-24 h-16 rounded-xl bg-zinc-800/60 flex-shrink-0 flex items-center justify-center">
                        <Newspaper size={18} className="text-zinc-600"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="white" size="sm">{item.publisher}</Badge>
                        <span className="text-zinc-600 text-xs">
                          {new Date(item.publishedAt).toLocaleDateString('fr-FR', {
                            day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0 mt-1"/>
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
