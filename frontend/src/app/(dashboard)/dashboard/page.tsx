'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, BarChart3, Search, Bell,
  Calendar, Eye, ArrowRight, Zap, Activity,
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard, SkeletonLine } from '@/components/ui/Spinner'

interface User { id:string; name:string; email:string; role:string; organization:{ name:string; plan:string } }
interface Index { symbol:string; name:string; price:number; change:number; changePercent:number }
interface EarningsEvent { symbol:string; company:string; date:string; epsEstimate?:number; epsActual?:number; surprisePct?:number }
interface WatchItem { symbol:string; companyName:string; quote:{ price:number; changePercent:number }|null }

const INDEX_NAMES: Record<string,string> = {
  SPY:'S&P 500', QQQ:'NASDAQ', DIA:'Dow Jones', IWM:'Russell 2000', '^VIX':'VIX',
}

const QUICK_LINKS = [
  { href:'/portfolio', icon:<BarChart3 size={20}/>, label:'Portefeuille', color:'text-blue-600',   bg:'bg-blue-50',   border:'border-blue-100'   },
  { href:'/screener',  icon:<Search    size={20}/>, label:'Screener',     color:'text-purple-600', bg:'bg-purple-50', border:'border-purple-100' },
  { href:'/alerts',    icon:<Bell      size={20}/>, label:'Alertes',      color:'text-amber-600',  bg:'bg-amber-50',  border:'border-amber-100'  },
  { href:'/calendar',  icon:<Calendar  size={20}/>, label:'Calendrier',   color:'text-green-600',  bg:'bg-green-50',  border:'border-green-100'  },
]

function FadeUp({ children, delay=0, className='' }: { children:React.ReactNode; delay?:number; className?:string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:20 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.5, delay, ease:[0.22,1,0.36,1] }}
      className={className}>
      {children}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-gray-900 font-bold text-sm">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [user,      setUser]      = useState<User|null>(null)
  const [indices,   setIndices]   = useState<Index[]>([])
  const [earnings,  setEarnings]  = useState<EarningsEvent[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [history,   setHistory]   = useState<{ date:string; close:number }[]>([])
  const [loading,   setLoading]   = useState(true)
  const [chartSymbol, setChartSymbol] = useState('AAPL')

  useEffect(() => {
    Promise.all([
      api.get('/users/me'),
      api.get('/market/overview'),
      api.get('/market/earnings'),
      api.get('/watchlist'),
      api.get('/market/AAPL/historical?period=1mo'),
    ]).then(([u,idx,earn,wl,hist]) => {
      setUser(u.data); setIndices(idx.data)
      setEarnings(earn.data.slice(0,8)); setWatchlist(wl.data.slice(0,6))
      setHistory(hist.data); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const changeChart = async (sym: string) => {
    setChartSymbol(sym)
    const r = await api.get(`/market/${sym}/historical?period=1mo`)
    setHistory(r.data)
  }

  if (loading) return (
    <div className="p-6 space-y-5">
      <SkeletonLine className="w-48 h-8 bg-gray-200" />
      <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_,i) => <SkeletonCard key={i} className="bg-white border-gray-200"/>)}</div>
      <div className="grid grid-cols-3 gap-4"><SkeletonCard className="col-span-2 h-64 bg-white border-gray-200"/><SkeletonCard className="bg-white border-gray-200"/></div>
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcomingEarnings = earnings.filter(e => e.date >= today)
  const pastEarnings     = earnings.filter(e => e.date <  today)

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <FadeUp>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {greet()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {user?.organization.name} ·{' '}
              <span className={cn(user?.organization.plan === 'FREE' ? 'text-gray-400' : 'text-amber-600 font-semibold')}>
                Plan {user?.organization.plan}
              </span>
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium">
            <Zap size={11}/> Marché ouvert
          </span>
        </div>
      </FadeUp>

      {/* Indices */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {indices.length === 0
          ? [...Array(5)].map((_,i) => (
              <FadeUp key={i} delay={i*0.06}>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-2/3"/>
                  <div className="h-6 bg-gray-100 rounded w-3/4"/>
                  <div className="h-3 bg-gray-100 rounded w-1/2"/>
                </div>
              </FadeUp>
            ))
          : indices.map((idx,i) => (
            <FadeUp key={idx.symbol} delay={i*0.06}>
              <motion.button whileHover={{ y:-2 }} onClick={() => changeChart(idx.symbol)}
                className={cn(
                  'w-full text-left bg-white border rounded-2xl p-4 transition-all shadow-sm',
                  chartSymbol === idx.symbol
                    ? 'border-blue-400 bg-blue-50 shadow-blue-100'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                )}>
                <p className="text-gray-500 text-xs font-medium truncate">{INDEX_NAMES[idx.symbol] ?? idx.symbol}</p>
                <p className="text-gray-900 font-bold text-lg mt-1 tabular-nums">
                  {idx.price?.toLocaleString('fr-FR', { maximumFractionDigits:2 })}
                </p>
                <div className={cn('flex items-center gap-1 text-xs font-semibold mt-0.5',
                  (idx.changePercent??0) >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {(idx.changePercent??0) >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                  {Math.abs(idx.changePercent??0).toFixed(2)}%
                </div>
              </motion.button>
            </FadeUp>
          ))}
      </div>

      {/* Chart + Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FadeUp delay={0.1} className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500"/>
                  {chartSymbol}
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">30 derniers jours</p>
              </div>
              <Link href={`/stock/${chartSymbol}`}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium">
                Voir le profil <ArrowRight size={12}/>
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} tickLine={false}
                  axisLine={false} tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} tickLine={false} axisLine={false}
                  domain={['auto','auto']} tickFormatter={v=>`$${v}`} width={52}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#dg)" dot={false} activeDot={{ r:4, fill:'#3b82f6', strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </FadeUp>

        <FadeUp delay={0.15}>
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Eye size={15} className="text-gray-400"/> Watchlist
              </h2>
              <Link href="/watchlist" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Tout voir <ArrowRight size={11}/>
              </Link>
            </div>
            {watchlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Eye size={20} className="text-gray-400"/>
                </div>
                <p className="text-gray-500 text-sm font-medium">Watchlist vide</p>
                <Link href="/watchlist" className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Ajouter des titres →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {watchlist.map((w,i) => (
                  <motion.div key={w.symbol} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay:i*0.05 }}>
                    <Link href={`/stock/${w.symbol}`}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-gray-200 transition-colors">
                          {w.symbol[0]}
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-semibold">{w.symbol}</p>
                          <p className="text-gray-400 text-xs truncate max-w-[90px]">{w.companyName}</p>
                        </div>
                      </div>
                      {w.quote && (
                        <div className="text-right">
                          <p className="text-gray-900 text-sm font-bold tabular-nums">${w.quote.price.toFixed(2)}</p>
                          <p className={cn('text-xs font-semibold tabular-nums',
                            w.quote.changePercent >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {w.quote.changePercent >= 0 ? '+' : ''}{w.quote.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </FadeUp>
      </div>

      {/* Earnings Calendar */}
      <FadeUp delay={0.2}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={15} className="text-purple-500"/> Résultats
            </h2>
            <Link href="/calendar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Calendrier complet <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {[
              { title:'À venir',          data:upcomingEarnings.slice(0,4), upcoming:true  },
              { title:'Résultats récents', data:pastEarnings.slice(0,4),    upcoming:false },
            ].map(col => (
              <div key={col.title} className="p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{col.title}</p>
                {col.data.length === 0
                  ? <p className="text-gray-400 text-sm py-4 text-center">Aucune donnée</p>
                  : col.data.map((e,i) => (
                    <motion.div key={e.symbol} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}>
                      <Link href={`/stock/${e.symbol}`}
                        className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                            {e.symbol[0]}
                          </div>
                          <div>
                            <p className="text-gray-900 text-xs font-bold">{e.symbol}</p>
                            <p className="text-gray-400 text-xs truncate max-w-[100px]">{e.company}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {col.upcoming ? (
                            <>
                              <p className="text-xs font-semibold text-blue-600">{e.date}</p>
                              {e.epsEstimate && <p className="text-gray-400 text-xs">Est. ${e.epsEstimate.toFixed(2)}</p>}
                            </>
                          ) : (
                            e.surprisePct !== undefined && (
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                                e.surprisePct >= 0 ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100')}>
                                {e.surprisePct >= 0 ? '+' : ''}{e.surprisePct.toFixed(1)}%
                              </span>
                            )
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
              </div>
            ))}
          </div>
        </Card>
      </FadeUp>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ href, icon, label, color, bg, border }, i) => (
          <FadeUp key={href} delay={0.25 + i*0.05}>
            <motion.div whileHover={{ y:-3 }} whileTap={{ scale:0.97 }}>
              <Link href={href}
                className={cn('flex flex-col items-center gap-2 p-5 bg-white border rounded-2xl hover:shadow-md transition-all group shadow-sm', border)}>
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', bg, color,
                  'group-hover:scale-110 transition-transform')}>
                  {icon}
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
              </Link>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  )
}
