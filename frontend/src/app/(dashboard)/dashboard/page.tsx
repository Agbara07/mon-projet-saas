'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  TrendingUp, TrendingDown, BarChart3,
  Calendar, Eye, ArrowRight, Zap, Activity,
  Clock, WifiOff,
} from 'lucide-react'
import { marketStatusLabel } from '@/lib/market-hours'
import Link from 'next/link'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import MarketPulseWidget from '@/components/terminal/MarketPulseWidget'
import { PctBadge } from '@/components/ui/PctBadge'
import { Sparkline, generateSparkline } from '@/components/ui/Sparkline'

interface User { id:string; name:string; email:string; role:string; organization:{ name:string; plan:string } }
interface Index { symbol:string; name:string; price:number; change:number; changePercent:number }
interface EarningsEvent { symbol:string; company:string; date:string; epsEstimate?:number; epsActual?:number; surprisePct?:number }
interface WatchItem { symbol:string; companyName:string; quote:{ price:number; changePercent:number }|null }

const INDEX_NAMES: Record<string,string> = {
  SPY:'S&P 500', QQQ:'NASDAQ', DIA:'Dow', IWM:'Russell', '^VIX':'VIX',
}

/* ── Skeleton row animé pour états vides ── */
function SkeletonWatchRow() {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b border-[var(--fin-border)] last:border-0"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <div className="w-12 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-60"/>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
        <div className="w-10 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-60"/>
      </div>
    </div>
  )
}

function SkeletonEarningsRow() {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--fin-border)] last:border-0"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
        <div className="w-24 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-50"/>
      </div>
      <div className="w-12 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded px-2 py-1.5 shadow-xl text-[10px] font-mono">
      <p className="text-[var(--fin-t3)]">{label}</p>
      <p className="text-[var(--fin-t1)] font-bold">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [user,      setUser]      = useState<User|null>(null)
  const [indices,   setIndices]   = useState<Index[]>([])
  const [earnings,  setEarnings]  = useState<EarningsEvent[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [history,   setHistory]   = useState<{ date:string; close:number }[]>([])
  const [chartSym,  setChartSym]  = useState('SPY')
  const [now,       setNow]       = useState('')

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
    tick(); const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Fire all requests in parallel — each section renders its own skeleton while loading
  useEffect(() => {
    api.get('/users/me').then(r => setUser(r.data)).catch(() => {})
    api.get('/market/overview').then(r => setIndices((r.data as Index[]).slice(0, 5))).catch(() => {})
    api.get('/market/earnings').then(r => setEarnings((r.data as EarningsEvent[]).slice(0, 10))).catch(() => {})
    api.get('/watchlist').then(r => setWatchlist((r.data as WatchItem[]).slice(0, 8))).catch(() => {})
    api.get('/market/SPY/historical?period=1mo').then(r => setHistory(r.data as { date:string; close:number }[])).catch(() => {})
  }, [])

  const changeChart = async (sym: string) => {
    setChartSym(sym)
    const r = await api.get(`/market/${sym}/historical?period=1mo`)
    setHistory(r.data)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = earnings.filter(e => e.date >= today).slice(0, 5)
  const past     = earnings.filter(e => e.date <  today).slice(0, 5)
  const isUp = (history.length >= 2) && history[history.length-1]?.close >= history[0]?.close

  return (
    <div className="flex flex-col h-full">

      {/* ── Status bar ── */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]',
        'bg-[var(--fin-panel)]',
      )}>
        <Activity size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Dashboard</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        {(() => {
          const { open, label } = marketStatusLabel()
          return (
            <span className={cn(
              'flex items-center gap-1 text-[10px] font-mono',
              open ? 'text-[var(--fin-green)]' : 'text-[var(--fin-t3)]'
            )}>
              {open ? <Zap size={9}/> : <WifiOff size={9}/>}
              {label}
            </span>
          )
        })()}
        <div className="flex-1"/>
        {user && (
          <span className="text-[10px] font-mono text-[var(--fin-t3)]">
            {user.organization.name} · <span className={cn('font-bold', user.organization.plan === 'FREE' ? 'text-[var(--fin-t3)]' : 'text-[var(--fin-amber)]')}>{user.organization.plan}</span>
          </span>
        )}
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <span className="text-[10px] font-mono text-[var(--fin-t3)] flex items-center gap-1">
          <Clock size={9}/>{now}
        </span>
      </div>

      {/* ── Indices strip ── */}
      <div className={cn(
        'flex items-stretch border-b border-[var(--fin-border)] bg-[var(--fin-panel)] overflow-x-auto',
      )}>
        {indices.length === 0 ? (
          <div className="flex gap-px">{[...Array(5)].map((_,i) => (
            <div key={i} className="w-36 h-12 bg-[var(--fin-surface)] animate-pulse"/>
          ))}</div>
        ) : indices.map((idx, i) => {
          const up = (idx.changePercent ?? 0) >= 0
          const active = chartSym === idx.symbol
          return (
            <button key={idx.symbol} onClick={() => changeChart(idx.symbol)}
              className={cn(
                'flex flex-col items-start px-4 py-2 text-left flex-shrink-0 min-w-[120px] transition-colors',
                'border-r border-[var(--fin-border)]',
                active ? 'bg-[var(--fin-active)]' : 'hover:bg-[var(--fin-hover)]'
              )}>
              <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide">{INDEX_NAMES[idx.symbol] ?? idx.symbol}</span>
              {/* ← kf-num: monospace + tabular-nums Koyfin */}
              <span className="kf-num text-sm font-bold text-[var(--fin-t1)] mt-0.5">
                {idx.price?.toLocaleString('fr-FR', { maximumFractionDigits:2 })}
              </span>
              {/* ← PctBadge Koyfin: fond teinté pastel */}
              <PctBadge value={idx.changePercent ?? 0} size="xs"/>
            </button>
          )
        })}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto p-4 space-y-3">

        {/* Chart + Watchlist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Chart */}
          <div className={cn('lg:col-span-2 rounded-lg border border-[var(--fin-border)] overflow-hidden', 'bg-[var(--fin-panel)]')}>
            <div className={cn('flex items-center gap-3 px-3 py-2 border-b border-[var(--fin-border)]', 'bg-[var(--fin-surface)]')}>
              <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Graphique</span>
              <span className="text-[10px] font-mono font-bold text-[var(--fin-blue)]">{chartSym}</span>
              <span className="text-[9px] text-[var(--fin-t3)] font-mono">30j</span>
              <div className="flex-1"/>
              <Link href={`/stock/${chartSym}`} className="flex items-center gap-1 text-[10px] text-[var(--fin-blue)] hover:opacity-80 transition-opacity">
                Profil <ArrowRight size={9}/>
              </Link>
            </div>
            <div className="p-3">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={history} margin={{ top:4, right:4, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={isUp ? 'var(--fin-green)' : 'var(--fin-red)'} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={isUp ? 'var(--fin-green)' : 'var(--fin-red)'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--fin-border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:9, fill:'var(--fin-t3)', fontFamily:'monospace' }}
                    tickLine={false} axisLine={false} tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                  <YAxis tick={{ fontSize:9, fill:'var(--fin-t3)', fontFamily:'monospace' }}
                    tickLine={false} axisLine={false} domain={['auto','auto']} tickFormatter={v=>`$${v}`} width={48}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area type="monotone" dataKey="close"
                    stroke={isUp ? 'var(--fin-green)' : 'var(--fin-red)'} strokeWidth={1.5}
                    fill="url(#cg)" dot={false}
                    activeDot={{ r:3, fill: isUp ? 'var(--fin-green)' : 'var(--fin-red)', strokeWidth:0 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Watchlist */}
          <div className={cn('rounded-lg border border-[var(--fin-border)] overflow-hidden', 'bg-[var(--fin-panel)]')}>
            <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-[var(--fin-border)]', 'bg-[var(--fin-surface)]')}>
              <Eye size={10} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
              <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Watchlist</span>
              <div className="flex-1"/>
              <Link href="/watchlist" className="text-[9px] text-[var(--fin-blue)] hover:opacity-80 flex items-center gap-0.5">
                Tout <ArrowRight size={8}/>
              </Link>
            </div>
            {watchlist.length === 0 ? (
              /* Skeleton immersif : table pré-remplie avec placeholder animé */
              <div role="status" aria-label="Watchlist vide — chargement en attente">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonWatchRow key={i}/>)}
                <div className="flex items-center justify-center py-2">
                  <Link href="/watchlist"
                    className="flex items-center gap-1 text-[10px] text-[var(--fin-blue)] hover:opacity-80 font-mono font-bold"
                    aria-label="Ajouter des titres à la watchlist">
                    + Ajouter des titres
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {watchlist.map((w, i) => (
                  <Link key={w.symbol} href={`/stock/${w.symbol}`}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 transition-colors group',
                      'border-b border-[var(--fin-border)] last:border-0',
                      'hover:bg-[var(--fin-hover)]'
                    )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-[var(--fin-t1)] w-14 flex-shrink-0">{w.symbol}</span>
                      <span className="text-[10px] text-[var(--fin-t3)] truncate">{w.companyName}</span>
                    </div>
                    {w.quote && (
                      <div className="text-right flex-shrink-0 ml-2 space-y-0.5">
                        {/* kf-num: prix monospace aligné */}
                        <p className="kf-num text-xs font-bold text-[var(--fin-t1)]">${w.quote.price.toFixed(2)}</p>
                        {/* PctBadge Koyfin muted */}
                        <div className="flex justify-end">
                          <PctBadge value={w.quote.changePercent} size="xs"/>
                        </div>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Earnings + Quick nav */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Earnings */}
          <div className={cn('lg:col-span-2 rounded-lg border border-[var(--fin-border)] overflow-hidden', 'bg-[var(--fin-panel)]')}>
            <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-[var(--fin-border)]', 'bg-[var(--fin-surface)]')}>
              <Calendar size={10} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
              <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Résultats d'entreprises</span>
              <div className="flex-1"/>
              <Link href="/calendar" className="text-[9px] text-[var(--fin-blue)] hover:opacity-80 flex items-center gap-0.5">
                Calendrier <ArrowRight size={8}/>
              </Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--fin-border)]">
              {[
                { title:'À VENIR', data:upcoming, future:true },
                { title:'RÉCENTS', data:past,     future:false },
              ].map(col => (
                <div key={col.title}>
                  <p className="px-3 py-1.5 text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest border-b border-[var(--fin-border)] bg-[var(--fin-surface)]">{col.title}</p>
                  {col.data.length === 0 ? (
                    <div role="status" aria-label="Données en cours de chargement">
                      {Array.from({length:3}).map((_,i) => <SkeletonEarningsRow key={i}/>)}
                    </div>
                  ) : col.data.map(e => (
                    <Link key={e.symbol} href={`/stock/${e.symbol}`}
                      className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--fin-border)] last:border-0 hover:bg-[var(--fin-hover)] transition-colors">
                      <div>
                        <p className="font-mono font-bold text-[11px] text-[var(--fin-t1)]">{e.symbol}</p>
                        <p className="text-[9px] text-[var(--fin-t3)] truncate max-w-[90px]">{e.company}</p>
                      </div>
                      <div className="text-right">
                        {col.future ? (
                          <span className="font-mono text-[10px] text-[var(--fin-blue)]">{e.date}</span>
                        ) : e.surprisePct !== undefined ? (
                          <PctBadge value={e.surprisePct} size="xs" showArrow={false}/>
                        ) : (
                          <span className="font-mono text-[9px] text-[var(--fin-t3)]">{e.date}</span>
                        )}
                        {e.epsEstimate != null && (
                          <p className="font-mono text-[9px] text-[var(--fin-t3)]">est. ${e.epsEstimate.toFixed(2)}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ✦ Market Pulse — remplace le bloc Navigation doublon */}
          <MarketPulseWidget/>
        </div>
      </div>
    </div>
  )
}
