'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3, Eye, Search,
  CalendarDays, Bell, CreditCard, Settings, Shield,
  TrendingUp, Globe, X, Clock, Zap, Crown, BarChart2,
} from 'lucide-react'
import type { CurrentUser } from '@/hooks/useCurrentUser'

const NAV = [
  { href:'/dashboard', label:'Dashboard',  Icon:LayoutDashboard, key:'1', shortcut:'Ctrl+1' },
  { href:'/portfolio', label:'Portfolio',  Icon:BarChart3,        key:'2', shortcut:'Ctrl+2' },
  { href:'/watchlist', label:'Watchlist',  Icon:Eye,              key:'3', shortcut:'Ctrl+3' },
  { href:'/screener',  label:'Screener',   Icon:Search,           key:'4', shortcut:'Ctrl+4' },
  { href:'/calendar',  label:'Calendrier', Icon:CalendarDays,     key:'5', shortcut:'Ctrl+5' },
  { href:'/alerts',    label:'Alertes',    Icon:Bell,             key:'6', shortcut:'Ctrl+6' },
  { href:'/brvm',      label:'BRVM',       Icon:Globe,            key:'7', shortcut:'Ctrl+7' },
  { href:'/macro',     label:'Macro',      Icon:BarChart2,        key:'8', shortcut:'Ctrl+8' },
]

const NAV_BOTTOM = [
  { href:'/billing',  label:'Abonnement', Icon:CreditCard },
  { href:'/settings', label:'Paramètres', Icon:Settings   },
]

export interface SidebarProps {
  user:          CurrentUser | null
  trialActive:   boolean
  trialDaysLeft: number
  /** Mobile only: whether the drawer is open */
  mobileOpen:    boolean
  onMobileClose: () => void
}

export default function Sidebar({ user, trialActive, trialDaysLeft, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const plan     = user?.organization?.plan ?? 'FREE'
  const isPaid   = plan !== 'FREE'
  const isAdmin  = user?.role === 'OWNER' || user?.role === 'ADMIN'

  // Keyboard shortcuts Ctrl+1-7
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const item = NAV.find(n => n.key === e.key)
      if (item) { e.preventDefault(); router.push(item.href) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])

  // Auto-close mobile drawer on route change
  useEffect(() => {
    onMobileClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const navLink = (href: string, label: string, Icon: React.ElementType, shortcut?: string, key?: string) => {
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        title={shortcut ? `${label} — ${shortcut}` : label}
        className={cn(
          'flex items-center gap-2 px-2 py-[5px] rounded text-[11px] font-medium transition-colors group',
          active
            ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]'
            : 'text-[var(--fin-t2)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fin-blue)] focus-visible:ring-inset'
        )}
      >
        <Icon size={13} strokeWidth={1.5} aria-hidden="true"
          className={cn('flex-shrink-0 transition-colors',
            active ? 'text-[var(--fin-blue)]' : 'text-[var(--fin-t3)] group-hover:text-[var(--fin-t2)]'
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        {key && (
          <kbd aria-hidden="true" className="hidden group-hover:flex items-center text-[9px] font-mono px-1 py-0.5 rounded leading-none bg-[var(--fin-surface)] text-[var(--fin-t3)] border border-[var(--fin-border)]">
            ⌘{key}
          </kbd>
        )}
      </Link>
    )
  }

  const footer = (
    <div className="px-1.5 py-1.5 border-t border-[var(--fin-border)] space-y-1">
      {trialActive ? (
        <Link href="/billing" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-all bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)] border-opacity-25 hover:border-opacity-50">
          <Clock size={11} strokeWidth={1.5} aria-hidden="true"/>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-none">Trial Pro</p>
            <p className="text-[9px] mt-0.5 opacity-80">{trialDaysLeft}j restant{trialDaysLeft > 1 ? 's' : ''}</p>
          </div>
          <Zap size={10}/>
        </Link>
      ) : isPaid ? (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)] border-opacity-20">
          <Crown size={11} strokeWidth={1.5} aria-hidden="true"/>
          <span className="font-semibold flex-1">Plan {plan}</span>
          <span className="text-[9px] opacity-70">actif</span>
        </div>
      ) : (
        <Link href="/billing" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-all bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)] border-opacity-25 hover:border-opacity-50">
          <CreditCard size={11} strokeWidth={1.5} aria-hidden="true"/>
          <span className="font-semibold flex-1">Passer à Pro</span>
        </Link>
      )}
      <p className="text-[9px] text-[var(--fin-t3)] font-mono text-center leading-relaxed">⌘K Palette · ⌘1–7 Nav</p>
    </div>
  )

  const navContent = (showClose: boolean) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--fin-border)]">
        <Link href="/dashboard" aria-label="InvestSaaS Terminal" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fin-blue)] rounded">
          <div className="w-6 h-6 rounded bg-[var(--fin-green)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <TrendingUp size={12} strokeWidth={2.5} className="text-white"/>
          </div>
          <div>
            <p className="font-bold text-[var(--fin-t1)] text-[11px] leading-none tracking-tight">InvestSaaS</p>
            <p className="text-[var(--fin-t3)] text-[9px] mt-0.5 font-mono tracking-widest uppercase">Terminal</p>
          </div>
        </Link>
        {showClose && (
          <button onClick={onMobileClose} aria-label="Fermer le menu" className="p-1 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors">
            <X size={15}/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1.5 py-1.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.15em] px-2 py-1 mb-0.5" aria-hidden="true">Marchés</p>
        {NAV.map(({ href, label, Icon, key, shortcut }) => navLink(href, label, Icon, shortcut, key))}
        <div className="mt-2 pt-2 border-t border-[var(--fin-border)]">
          <p className="text-[10px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.15em] px-2 py-1 mb-0.5" aria-hidden="true">Compte</p>
          {NAV_BOTTOM.map(({ href, label, Icon }) => navLink(href, label, Icon))}
          {isAdmin && navLink('/admin', 'Admin', Shield)}
        </div>
      </nav>

      {footer}
    </>
  )

  return (
    <>
      {/* ─── DESKTOP : always visible, in flex flow ─────────── */}
      <aside
        className="hidden lg:flex flex-col w-[172px] min-h-screen flex-shrink-0 bg-[var(--fin-panel)] border-r border-[var(--fin-border)]"
        role="navigation"
        aria-label="Navigation principale"
      >
        {navContent(false)}
      </aside>

      {/* ─── MOBILE : fixed overlay drawer ──────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} aria-hidden="true"/>
          {/* Drawer */}
          <aside
            className="absolute inset-y-0 left-0 flex flex-col w-[220px] bg-[var(--fin-panel)] border-r border-[var(--fin-border)] shadow-2xl"
            role="navigation"
            aria-label="Navigation principale"
          >
            {navContent(true)}
          </aside>
        </div>
      )}
    </>
  )
}
