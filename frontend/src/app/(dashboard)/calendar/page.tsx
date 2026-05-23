'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, Clock } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface EarningsEvent {
  symbol:string; company:string; date:string
  epsEstimate?:number; epsActual?:number
  surprise?:number; surprisePct?:number
}

type Filter = 'all'|'upcoming'|'past'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday:'long', day:'numeric', month:'long',
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day:'2-digit', month:'2-digit',
  })
}

function groupByDate(events: EarningsEvent[]) {
  return events.reduce<Record<string,EarningsEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
}

export default function CalendarPage() {
  const [events,  setEvents]  = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Filter>('all')

  useEffect(() => {
    api.get('/market/earnings')
      .then(r => { setEvents(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const today    = new Date().toISOString().split('T')[0]
  const filtered = events.filter(e => {
    if (filter === 'upcoming') return e.date >= today
    if (filter === 'past')     return e.date <  today
    return true
  }).sort((a,b) => a.date.localeCompare(b.date))

  const grouped  = groupByDate(filtered)
  const upcoming = events.filter(e => e.date >= today).length
  const past     = events.filter(e => e.date <  today).length

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key:'all',      label:'TOUS',         count:events.length },
    { key:'upcoming', label:'À VENIR',      count:upcoming },
    { key:'past',     label:'PUBLIÉS',      count:past },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className={cn('flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
        <Calendar size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Calendrier Résultats</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono transition-colors',
              filter===f.key ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]' : 'text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t2)]'
            )}>
            <span className="font-bold">{f.count}</span> {f.label}
          </button>
        ))}
        <div className="flex-1"/>
        <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--fin-t3)]">
          <Clock size={9}/>{today}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
            <RefreshCw size={14} strokeWidth={1.5} className="animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Calendar size={24} strokeWidth={1} className="text-[var(--fin-t3)] mb-3"/>
            <p className="text-sm font-medium text-[var(--fin-t2)]">Aucun événement</p>
            <p className="text-[10px] text-[var(--fin-t3)] mt-1">Essayez un autre filtre</p>
          </div>
        ) : (
          <div>
            {/* Table header fixe */}
            <table className="w-full sticky">
              <thead className={cn('border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                <tr>
                  <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)] w-28">DATE</th>
                  <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)]">SYMBOLE</th>
                  <th className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)]">SOCIÉTÉ</th>
                  <th className="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)] w-28">EPS ESTIMÉ</th>
                  <th className="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)] w-28">EPS RÉEL</th>
                  <th className="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)] w-28">SURPRISE</th>
                  <th className="px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)] w-24">VERDICT</th>
                  <th className="px-3 py-1.5 w-8"/>
                </tr>
              </thead>
            </table>

            {/* Grouped rows */}
            {Object.entries(grouped)
              .sort(([a],[b]) => a.localeCompare(b))
              .map(([date, dayEvents]) => {
                const isFuture  = date >= today
                const isToday   = date === today
                return (
                  <div key={date}>
                    {/* Date separator */}
                    <div className={cn(
                      'sticky top-0 z-10 flex items-center gap-3 px-3 py-1 border-b border-[var(--fin-border)]',
                      isToday ? 'bg-[var(--fin-active)]' : 'bg-[var(--fin-surface)]'
                    )}>
                      <span className={cn('font-mono text-[10px] font-bold w-20 flex-shrink-0',
                        isToday ? 'text-[var(--fin-blue)]' : isFuture ? 'text-[var(--fin-t2)]' : 'text-[var(--fin-t3)]')}>
                        {fmtDateShort(date)}
                      </span>
                      <span className={cn('text-[9px] capitalize flex-1',
                        isToday ? 'text-[var(--fin-blue)] font-bold' : 'text-[var(--fin-t3)]')}>
                        {isToday ? '● AUJOURD\'HUI' : fmtDate(date)}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--fin-t3)]">{dayEvents.length} résultat{dayEvents.length>1?'s':''}</span>
                    </div>

                    {/* Events for this date */}
                    <table className="w-full">
                      <tbody>
                        {dayEvents.map((e, i) => {
                          const hasRes = e.epsActual != null && e.epsEstimate != null
                          const pct    = e.surprisePct ?? 0
                          const verdict = hasRes
                            ? (Math.abs(pct) < 1 ? 'inline' : pct > 0 ? 'beat' : 'miss')
                            : null
                          const verdictStyle = {
                            beat:   'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
                            miss:   'bg-[var(--fin-red-bg)] text-[var(--fin-red)]',
                            inline: 'bg-[var(--fin-hover)] text-[var(--fin-t3)]',
                          }
                          const verdictLabel = { beat:'▲ BEAT', miss:'▼ MISS', inline:'─ IN LINE' }
                          return (
                            <motion.tr key={e.symbol}
                              initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                              className={cn('border-b border-[var(--fin-border)] last:border-0 transition-colors group','hover:bg-[var(--fin-hover)]')}>
                              <td className="px-3 py-2 w-28">
                                <span className={cn('font-mono text-[10px]', isFuture?'text-[var(--fin-blue)]':'text-[var(--fin-t3)]')}>
                                  {isFuture ? '→ ' : ''}{fmtDateShort(e.date)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Link href={`/stock/${e.symbol}`} className="font-mono font-bold text-xs text-[var(--fin-t1)] hover:text-[var(--fin-blue)] transition-colors">
                                  {e.symbol}
                                </Link>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-[10px] text-[var(--fin-t2)] truncate max-w-[180px] block">{e.company}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                                {e.epsEstimate != null
                                  ? <span className="text-[var(--fin-t2)]">${e.epsEstimate.toFixed(2)}</span>
                                  : <span className="text-[var(--fin-t3)]">—</span>
                                }
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                                {e.epsActual != null
                                  ? <span className={verdict==='beat'?'text-[var(--fin-green)]':verdict==='miss'?'text-[var(--fin-red)]':'text-[var(--fin-t2)]'}>
                                      ${e.epsActual.toFixed(2)}
                                    </span>
                                  : <span className="text-[var(--fin-t3)]">—</span>
                                }
                              </td>
                              <td className="px-3 py-2 text-right">
                                {e.surprisePct != null ? (
                                  <span className={cn(
                                    'font-mono text-[10px] font-bold tabular-nums',
                                    pct > 0 ? 'text-[var(--fin-green)]' : pct < 0 ? 'text-[var(--fin-red)]' : 'text-[var(--fin-t3)]'
                                  )}>
                                    {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="font-mono text-[10px] text-[var(--fin-t3)]">—</span>
                                )}
                              </td>
                              {/* BEAT / MISS / IN LINE badge */}
                              <td className="px-3 py-2 text-center w-24">
                                {verdict ? (
                                  <span className={cn(
                                    'inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold font-mono',
                                    verdictStyle[verdict]
                                  )}>
                                    {verdictLabel[verdict]}
                                  </span>
                                ) : isFuture ? (
                                  <span className="text-[8px] font-mono text-[var(--fin-t3)]">À VENIR</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                <Link href={`/stock/${e.symbol}`}
                                  className="flex items-center justify-end gap-0.5 text-[9px] text-[var(--fin-t3)] hover:text-[var(--fin-blue)] opacity-0 group-hover:opacity-100 transition-all">
                                  <ArrowUpRight size={9} strokeWidth={1.5}/>
                                </Link>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className={cn('flex items-center gap-4 px-4 py-1.5 border-t border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            <span className="text-[var(--fin-t1)] font-bold">{filtered.length}</span> événement{filtered.length>1?'s':''}
          </span>
          <span className="text-[9px] font-mono text-[var(--fin-blue)]">{upcoming} à venir</span>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">{past} publiés</span>
        </div>
      )}
    </div>
  )
}
