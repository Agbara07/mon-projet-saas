'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, BarChart3, Eye, Search, CalendarDays,
  Bell, CreditCard, Globe, TrendingUp, TrendingDown,
  Settings, Shield, X, ArrowRight,
} from 'lucide-react'

const PAGES = [
  { label: 'Dashboard',          href: '/dashboard',  Icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Portefeuille',       href: '/portfolio',  Icon: BarChart3,        group: 'Navigation' },
  { label: 'Watchlist',          href: '/watchlist',  Icon: Eye,              group: 'Navigation' },
  { label: 'Screener',           href: '/screener',   Icon: Search,           group: 'Navigation' },
  { label: 'Calendrier résultats', href: '/calendar', Icon: CalendarDays,     group: 'Navigation' },
  { label: 'Alertes',            href: '/alerts',     Icon: Bell,             group: 'Navigation' },
  { label: 'BRVM — Marché UEMOA', href: '/brvm',      Icon: Globe,            group: 'Navigation' },
  { label: 'Abonnement',         href: '/billing',    Icon: CreditCard,       group: 'Compte' },
  { label: 'Paramètres',         href: '/settings',   Icon: Settings,         group: 'Compte' },
  { label: 'Admin',              href: '/admin',      Icon: Shield,           group: 'Compte' },
]

const QUICK_ACTIONS = [
  { label: 'Top Gainers du jour',  href: '/screener?minChangePercent=2', Icon: TrendingUp   },
  { label: 'Top Losers du jour',   href: '/screener?maxChangePercent=-2', Icon: TrendingDown },
  { label: 'Ajouter une alerte',   href: '/alerts',                       Icon: Bell         },
  { label: 'Rechercher un titre',  href: '/screener',                     Icon: Search       },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
    setQuery('')
  }, [router, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  const groups = Array.from(new Set(PAGES.map(p => p.group)))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <Command className="w-full" shouldFilter>
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher une page, un titre, une action…"
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            <Command.Empty className="py-10 text-center text-sm text-gray-400">
              Aucun résultat pour « {query} »
            </Command.Empty>

            {/* Actions rapides */}
            {!query && (
              <Command.Group heading="Actions rapides">
                {QUICK_ACTIONS.map(({ label, href, Icon }) => (
                  <Command.Item
                    key={href}
                    value={label}
                    onSelect={() => navigate(href)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm text-gray-700
                               hover:bg-blue-50 hover:text-blue-700 rounded-xl mx-2 transition-colors
                               data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700"
                  >
                    <Icon size={15} className="flex-shrink-0 text-gray-400" />
                    <span className="flex-1">{label}</span>
                    <ArrowRight size={13} className="text-gray-300" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Navigation */}
            {groups.map(group => (
              <Command.Group key={group} heading={group}>
                {PAGES.filter(p => p.group === group).map(({ label, href, Icon }) => (
                  <Command.Item
                    key={href}
                    value={`${label} ${href}`}
                    onSelect={() => navigate(href)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm text-gray-700
                               hover:bg-blue-50 hover:text-blue-700 rounded-xl mx-2 transition-colors
                               data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700"
                  >
                    <Icon size={15} className="flex-shrink-0 text-gray-400" />
                    <span className="flex-1">{label}</span>
                    <ArrowRight size={13} className="text-gray-300" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↑↓</kbd> naviguer</span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↵</kbd> ouvrir</span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">ESC</kbd> fermer</span>
          </div>
        </Command>
      </div>
    </div>
  )
}

/* ── Hook global Cmd+K ──────────────────────────────────── */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen, close: () => setOpen(false) }
}
