'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3, Eye, Search,
  CalendarDays, Bell, CreditCard, Settings, Shield,
  TrendingUp, Globe, X, Clock, Zap, Crown,
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
]
const NAV_BOTTOM = [
  { href:'/billing',  label:'Abonnement', Icon:CreditCard },
  { href:'/settings', label:'Paramètres', Icon:Settings   },
]

interface SidebarProps {
  user:         CurrentUser | null
  trialActive:  boolean
  trialDaysLeft:number
  open:         boolean           // mobile drawer state
  onClose:      () => void
}

export default function Sidebar({ user, trialActive, trialDaysLeft, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const plan     = user?.organization?.plan ?? 'FREE'
  const isPaid   = plan !== 'FREE'
  const isAdmin  = user?.role === 'OWNER' || user?.role === 'ADMIN'

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const item = NAV.find(n => n.key === e.key)
      if (item) { e.preventDefault(); router.push(item.href) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])

  // Close drawer on navigation (mobile)
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const navLink = (href: string, label: string, Icon: React.ElementType, shortcut?: string, key?: string) => {
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        aria-keyshortcuts={shortcut}
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
          <kbd aria-hidden="true" className={cn(
            'hidden group-hover:flex items-center text-[9px] font-mono px-1 py-0.5 rounded leading-none',
            'bg-[var(--fin-surface)] text-[var(--fin-t3)] border border-[var(--fin-border)]'
          )}>
            ⌘{key}
          </kbd>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <aside
      role="navigation"
      aria-label="Navigation principale"
      className="flex flex-col w-full h-full bg-[var(--fin-panel)] border-r border-[var(--fin-border)]"
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--fin-border)]">
        <Link
          href="/dashboard"
          aria-label="InvestSaaS Terminal — Accueil"
          className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-[var(--fin-blue)] rounded"
        >
          <div className="w-6 h-6 rounded bg-[var(--fin-green)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <TrendingUp size={12} strokeWidth={2.5} className="text-white"/>
          </div>
          <div>
            <p className="font-bold text-[var(--fin-t1)] text-[11px] leading-none tracking-tight">InvestSaaS</p>
            <p className="text-[var(--fin-t3)] text-[9px] mt-0.5 font-mono tracking-widest uppercase">Terminal</p>
          </div>
        </Link>
        {/* Bouton fermeture — mobile uniquement */}
        <button
          onClick={onClose}
          aria-label="Fermer le menu"
          className="lg:hidden p-1 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors"
        >
          <X size={15}/>
        </button>
      </div>

      {/* ── Nav principale ── */}
      <nav className="flex-1 px-1.5 py-1.5 overflow-y-auto" aria-label="Marchés">
        <p className="text-[10px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.15em] px-2 py-1 mb-0.5" aria-hidden="true">
          Marchés
        </p>

        {NAV.map(({ href, label, Icon, key, shortcut }) =>
          navLink(href, label, Icon, shortcut, key)
        )}

        {/* ── Compte ── */}
        <div className="mt-2 pt-2 border-t border-[var(--fin-border)]" aria-label="Compte">
          <p className="text-[10px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.15em] px-2 py-1 mb-0.5" aria-hidden="true">
            Compte
          </p>
          {NAV_BOTTOM.map(({ href, label, Icon }) => navLink(href, label, Icon))}

          {/* Admin — visible OWNER/ADMIN uniquement */}
          {isAdmin && navLink('/admin', 'Admin', Shield)}
        </div>
      </nav>

      {/* ── Footer contextuel plan/trial ── */}
      <div className="px-1.5 py-1.5 border-t border-[var(--fin-border)] space-y-1">
        {trialActive ? (
          /* Trial actif */
          <Link
            href="/billing"
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-all',
              'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)]',
              'border border-[var(--fin-amber)] border-opacity-25 hover:border-opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fin-amber)]'
            )}
          >
            <Clock size={11} strokeWidth={1.5} aria-hidden="true"/>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-none">Trial Pro</p>
              <p className="text-[9px] mt-0.5 opacity-80">{trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}</p>
            </div>
            <Zap size={10} aria-hidden="true"/>
          </Link>
        ) : isPaid ? (
          /* Plan payant actif */
          <div className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px]',
            'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
            'border border-[var(--fin-green)] border-opacity-20'
          )}>
            <Crown size={11} strokeWidth={1.5} aria-hidden="true"/>
            <span className="font-semibold flex-1">Plan {plan}</span>
            <span className="text-[9px] opacity-70">actif</span>
          </div>
        ) : (
          /* FREE — CTA upgrade */
          <Link
            href="/billing"
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-all',
              'bg-[var(--fin-green-bg)] text-[var(--fin-green)]',
              'border border-[var(--fin-green)] border-opacity-25 hover:border-opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fin-green)]'
            )}
          >
            <CreditCard size={11} strokeWidth={1.5} aria-hidden="true"/>
            <span className="font-semibold flex-1">Passer à Pro</span>
          </Link>
        )}

        <p className="text-[9px] text-[var(--fin-t3)] font-mono text-center leading-relaxed">
          ⌘K Palette · ⌘1–7 Nav
        </p>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop : sidebar dans le flux ── */}
      <div className="hidden lg:flex w-[172px] min-h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile : drawer overlay ── */}
      <div
        aria-hidden={!open}
        className={cn(
          'lg:hidden fixed inset-0 z-40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
        {/* Drawer */}
        <div className={cn(
          'absolute inset-y-0 left-0 w-[220px] transition-transform duration-200 ease-out shadow-2xl',
          open ? 'translate-x-0' : '-translate-x-full'
        )}>
          {sidebarContent}
        </div>
      </div>
    </>
  )
}
