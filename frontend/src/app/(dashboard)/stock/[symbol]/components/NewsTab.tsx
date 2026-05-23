'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface NewsItem {
  title: string; publisher: string; link: string; publishedAt: string
  thumbnail?: string; sentiment?: 'positive' | 'negative' | 'neutral'
}

function SentimentBadge({ sentiment }: { sentiment?: 'positive' | 'negative' | 'neutral' }) {
  if (!sentiment) return null
  const map = {
    positive: 'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
    negative: 'bg-[var(--fin-red-bg)] text-[var(--fin-red)]',
    neutral:  'bg-[var(--fin-hover)] text-[var(--fin-t3)]',
  }
  const label = { positive: '▲ POSITIF', negative: '▼ NÉGATIF', neutral: '─ NEUTRE' }
  return (
    <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded font-mono', map[sentiment])}>
      {label[sentiment]}
    </span>
  )
}

function timeAgo(iso: string) {
  const ts = new Date(iso).getTime()
  if (!ts || isNaN(ts)) return ''
  const diff = Date.now() - ts
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}min`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export default function NewsTab({ symbol }: { symbol: string }) {
  const [news,    setNews]    = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/market/${symbol}/news`)
      .then(r => setNews(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
      <RefreshCw size={14} strokeWidth={1.5} className="animate-spin mr-2" />
      <span className="text-xs font-mono">CHARGEMENT ACTUALITÉS...</span>
    </div>
  )

  if (!news.length) return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-sm font-medium text-[var(--fin-t2)]">Aucune actualité disponible</p>
      <p className="text-[10px] text-[var(--fin-t3)] mt-1">Benzinga ne couvre pas encore ce symbole</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="divide-y divide-[var(--fin-border)]"
    >
      {news.map((item, i) => (
        <motion.a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i, 10) * 0.03 }}
          className="flex items-start gap-3 p-4 hover:bg-[var(--fin-hover)] transition-colors group"
        >
          {/* Thumbnail */}
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-16 h-12 object-cover rounded flex-shrink-0 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="w-16 h-12 flex-shrink-0 bg-[var(--fin-hover)] rounded flex items-center justify-center">
              <span className="text-[8px] font-bold text-[var(--fin-t3)] font-mono">{symbol}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[12px] font-medium text-[var(--fin-t1)] leading-snug line-clamp-2 group-hover:text-[var(--fin-blue)] transition-colors">
                {item.title}
              </p>
              <ExternalLink size={10} strokeWidth={1.5} className="text-[var(--fin-t3)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-wide">{item.publisher}</span>
              <span className="text-[9px] text-[var(--fin-t3)] font-mono">{timeAgo(item.publishedAt)}</span>
              <SentimentBadge sentiment={item.sentiment} />
            </div>
          </div>
        </motion.a>
      ))}
    </motion.div>
  )
}
