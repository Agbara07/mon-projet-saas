'use client'

/**
 * MarketPulseWidget — Terminal financial pulse
 * Remplace le bloc navigation doublon du dashboard.
 * Affiche les indices globaux + BRVM en temps quasi-réel (refresh 30s).
 * Accessible : rôles ARIA, labels, tabIndex correct.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface MarketRow {
  label:   string
  value:   string
  change:  number   // valeur absolue
  pct:     number   // en %
  href?:   string
  tag?:    string   // ex: "BRVM"
}

const GLOBAL_SYMBOLS = [
  { symbol:'SPY',  label:'S&P 500'  },
  { symbol:'QQQ',  label:'NASDAQ'   },
  { symbol:'DIA',  label:'Dow Jones'},
  { symbol:'^VIX', label:'VIX'      },
]

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--fin-border)] last:border-0" aria-hidden="true">
      <div className="flex-1 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
      <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
      <div className="w-10 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse"/>
    </div>
  )
}

export default function MarketPulseWidget({ className }: { className?: string }) {
  const [rows,    setRows]    = useState<MarketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [lastUpd, setLastUpd] = useState<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const fetch = useCallback(async () => {
    try {
      const [overview, brvmRes] = await Promise.allSettled([
        api.get('/market/overview'),
        api.get('/market/brvm/indices'),
      ])

      const result: MarketRow[] = []

      // ── BRVM (priorité : marché africain de la plateforme)
      if (brvmRes.status === 'fulfilled') {
        const indices: any[] = brvmRes.value.data ?? []
        indices.slice(0, 2).forEach((idx: any) => {
          result.push({
            label:  idx.name ?? 'BRVM',
            value:  idx.value?.toFixed(2) ?? '—',
            change: idx.change ?? 0,
            pct:    idx.changePercent ?? 0,
            href:   '/brvm',
            tag:    'BRVM',
          })
        })
      }

      // ── Indices globaux
      if (overview.status === 'fulfilled') {
        const quotes: any[] = overview.value.data ?? []
        GLOBAL_SYMBOLS.forEach(({ symbol, label }) => {
          const q = quotes.find((x: any) => x.symbol === symbol)
          if (q) {
            result.push({
              label,
              value:  q.price?.toLocaleString('fr-FR', { maximumFractionDigits:2 }) ?? '—',
              change: q.change ?? 0,
              pct:    q.changePercent ?? 0,
              href:   `/stock/${symbol}`,
            })
          }
        })
      }

      setRows(result)
      setError(false)
      setLastUpd(new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    timerRef.current = setInterval(fetch, 30_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetch])

  return (
    <section
      className={cn(
        'rounded-lg border border-[var(--fin-border)] overflow-hidden',
        'bg-[var(--fin-panel)]',
        className
      )}
      aria-label="Indices de marché — mise à jour toutes les 30 secondes"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-1.5 border-b border-[var(--fin-border)]', 'bg-[var(--fin-surface)]')}>
        <TrendingUp size={10} strokeWidth={1.5} className="text-[var(--fin-t3)]" aria-hidden="true"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest flex-1">
          Market Pulse
        </span>
        {error ? (
          <WifiOff size={9} className="text-[var(--fin-red)]" aria-label="Données indisponibles"/>
        ) : (
          <Wifi size={9} className="text-[var(--fin-green)]" aria-label="Données en ligne"/>
        )}
        {lastUpd && (
          <time className="text-[8px] font-mono text-[var(--fin-t3)]" dateTime={lastUpd} aria-label={`Dernière mise à jour : ${lastUpd}`}>
            {lastUpd}
          </time>
        )}
        <button
          onClick={fetch}
          aria-label="Rafraîchir les indices de marché"
          className="flex items-center justify-center w-5 h-5 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors"
        >
          <RefreshCw size={9} strokeWidth={1.5} aria-hidden="true"/>
        </button>
      </div>

      {/* Rows */}
      <div role="list" aria-label="Indices financiers">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i}/>)
        ) : error ? (
          <div className="flex items-center justify-center py-6 text-center px-3">
            <p className="text-[10px] text-[var(--fin-t3)] font-mono">
              — Données non disponibles<br/>
              <button onClick={fetch} className="text-[var(--fin-blue)] hover:opacity-80 mt-1">
                Réessayer
              </button>
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center px-3">
            <p className="text-[10px] text-[var(--fin-t3)] font-mono">— En attente de données</p>
          </div>
        ) : rows.map((row, i) => {
          const up   = row.pct >= 0
          const isVix = row.label === 'VIX'

          // Pour le VIX : la hausse est négative (signal de peur)
          const positiveSignal = isVix ? !up : up

          const rowContent = (
            <div
              role="listitem"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 border-b border-[var(--fin-border)] last:border-0',
                'transition-colors',
                row.href ? 'cursor-pointer hover:bg-[var(--fin-hover)]' : ''
              )}
              aria-label={`${row.label} : ${row.value}, variation ${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(2)}%`}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {row.tag && (
                  <span className="text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] flex-shrink-0">
                    {row.tag}
                  </span>
                )}
                <span className="text-[10px] text-[var(--fin-t2)] truncate font-medium">
                  {row.label}
                </span>
              </div>

              {/* Valeur */}
              <span className="font-mono text-[11px] font-bold text-[var(--fin-t1)] tabular-nums flex-shrink-0">
                {row.value}
              </span>

              {/* Variation */}
              <span
                className={cn(
                  'flex items-center gap-0.5 font-mono text-[10px] font-bold tabular-nums flex-shrink-0 w-16 justify-end',
                  positiveSignal ? 'text-[var(--fin-green)]' : 'text-[var(--fin-red)]'
                )}
                aria-hidden="true"
              >
                {up
                  ? <TrendingUp  size={9} strokeWidth={1.5}/>
                  : <TrendingDown size={9} strokeWidth={1.5}/>
                }
                {up ? '+' : ''}{row.pct.toFixed(2)}%
              </span>
            </div>
          )

          return row.href ? (
            <Link key={i} href={row.href} className="block">
              {rowContent}
            </Link>
          ) : (
            <div key={i}>{rowContent}</div>
          )
        })}
      </div>

      {/* Footer note */}
      <div className={cn('px-3 py-1 border-t border-[var(--fin-border)]', 'bg-[var(--fin-surface)]')}>
        <p className="text-[8px] font-mono text-[var(--fin-t3)] text-center">
          Données avec délai · Refresh toutes les 30s
        </p>
      </div>
    </section>
  )
}
