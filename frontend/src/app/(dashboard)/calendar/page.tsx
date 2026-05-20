'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import Link from 'next/link'

interface EarningsEvent {
  symbol:string; company:string; date:string
  epsEstimate?:number; epsActual?:number
  surprise?:number; surprisePct?:number
}

type Filter = 'all' | 'upcoming' | 'past'

function groupByDate(events: EarningsEvent[]) {
  return events.reduce<Record<string,EarningsEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday:'long', day:'numeric', month:'long',
  })
}

function EarningsCard({ e, today }: { e:EarningsEvent; today:string }) {
  const isPast    = e.date < today
  const hasActual = e.epsActual != null
  const beat      = hasActual && e.epsEstimate != null && e.epsActual! >= e.epsEstimate

  return (
    <motion.div whileHover={{ y:-3, transition:{ duration:.2 } }}>
      <Link href={`/stock/${e.symbol}`}>
        <Card className="p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-black text-gray-600">
                {e.symbol[0]}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-bold text-gray-900 text-sm">{e.symbol}</p>
                  <ArrowUpRight size={12} className="text-gray-400"/>
                </div>
                <p className="text-gray-400 text-xs truncate max-w-[140px]">{e.company}</p>
              </div>
            </div>
            {hasActual
              ? <Badge variant={beat?'green':'red'} size="sm">
                  {e.surprisePct != null && `${e.surprisePct>=0?'+':''}${e.surprisePct.toFixed(1)}%`}
                </Badge>
              : <Badge variant="blue" size="sm">À venir</Badge>
            }
          </div>

          <div className="grid grid-cols-2 gap-2">
            {e.epsEstimate != null && (
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-gray-400 text-xs mb-0.5">BPA estimé</p>
                <p className="text-gray-900 font-bold text-sm tabular-nums">${e.epsEstimate.toFixed(2)}</p>
              </div>
            )}
            {hasActual && (
              <div className={cn('rounded-xl p-2.5', beat?'bg-green-50':'bg-red-50')}>
                <p className="text-gray-400 text-xs mb-0.5">BPA réel</p>
                <p className={cn('font-bold text-sm tabular-nums flex items-center gap-1', beat?'text-green-700':'text-red-600')}>
                  {beat?<TrendingUp size={12}/>:<TrendingDown size={12}/>}
                  ${e.epsActual!.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {hasActual && e.epsEstimate != null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Surprise</span>
                <span className={cn('font-semibold', beat?'text-green-600':'text-red-500')}>
                  {e.surprisePct != null ? `${e.surprisePct>=0?'+':''}${e.surprisePct.toFixed(1)}%` : '—'}
                </span>
              </div>
              <Progress value={Math.min(100,Math.abs(e.surprisePct??0))} color={beat?'green':'red'} size="sm"/>
            </div>
          )}

          <div className="mt-3">
            <p className="text-gray-400 text-xs">{fmtDate(e.date)}</p>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}

export default function CalendarPage() {
  const [events, setEvents]   = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('all')

  useEffect(() => {
    api.get('/market/earnings').then(r => { setEvents(r.data); setLoading(false) })
  }, [])

  const today  = new Date().toISOString().split('T')[0]
  const filtered = events.filter(e => {
    if (filter === 'upcoming') return e.date >= today
    if (filter === 'past')     return e.date <  today
    return true
  })
  const grouped     = groupByDate(filtered)
  const sortedDates = Object.keys(grouped).sort((a,b) =>
    filter === 'past' ? b.localeCompare(a) : a.localeCompare(b)
  )

  const upcomingCount = events.filter(e => e.date >= today).length
  const pastCount     = events.filter(e => e.date <  today).length
  const beatCount     = events.filter(e => e.epsActual != null && e.epsEstimate != null && e.epsActual >= e.epsEstimate).length

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Calendar size={22} className="text-purple-500"/> Calendrier résultats
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Annonces trimestrielles des grandes capitalisations</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {(['all','upcoming','past'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                filter===f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {f==='all'?'Tous':f==='upcoming'?'À venir':'Passés'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'À venir', value:upcomingCount, color:'text-blue-700',  bg:'bg-blue-50',  border:'border-blue-200' },
          { label:'Passés',  value:pastCount,     color:'text-gray-600',  bg:'bg-gray-100', border:'border-gray-200' },
          { label:'Battus',  value:beatCount,     color:'text-green-700', bg:'bg-green-50', border:'border-green-200'},
        ].map(({ label, value, color, bg, border }, i) => (
          <motion.div key={label} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.07 }}>
            <Card className="p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={cn('text-3xl font-black tabular-nums', color)}>{value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <RefreshCw size={32} className="animate-spin mb-3 text-purple-400"/>
          <p className="text-sm text-gray-500">Chargement des données...</p>
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-3">
            <Calendar size={28} className="text-purple-400"/>
          </div>
          <p className="font-medium text-gray-500">Aucun résultat trouvé</p>
        </div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence>
            {sortedDates.map(date => {
              const isToday = date === today
              const isPast  = date < today
              return (
                <motion.div key={date} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border',
                      isToday ? 'bg-purple-600 text-white border-purple-600' :
                      isPast  ? 'bg-white border-gray-200 text-gray-500 shadow-sm' :
                                'bg-blue-50 border-blue-200 text-blue-700')}>
                      <Calendar size={11}/>
                      {isToday ? "Aujourd'hui" : fmtDate(date)}
                    </div>
                    <div className="flex-1 h-px bg-gray-200"/>
                    <span className="text-gray-400 text-xs">{grouped[date].length} société{grouped[date].length>1?'s':''}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {grouped[date].map((e, i) => (
                      <motion.div key={e.symbol} initial={{ opacity:0, scale:.97 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:i*0.04 }}>
                        <EarningsCard e={e} today={today}/>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
