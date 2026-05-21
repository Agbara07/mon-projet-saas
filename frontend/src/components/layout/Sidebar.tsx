'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3, Eye, Search,
  CalendarDays, Bell, CreditCard, Settings, Shield, TrendingUp, Globe,
} from 'lucide-react'

const NAV = [
  { href:'/dashboard', label:'Dashboard',    Icon:LayoutDashboard, key:'1' },
  { href:'/portfolio', label:'Portfolio',    Icon:BarChart3,        key:'2' },
  { href:'/watchlist', label:'Watchlist',    Icon:Eye,              key:'3' },
  { href:'/screener',  label:'Screener',     Icon:Search,           key:'4' },
  { href:'/calendar',  label:'Calendrier',   Icon:CalendarDays,     key:'5' },
  { href:'/alerts',    label:'Alertes',      Icon:Bell,             key:'6' },
  { href:'/brvm',      label:'BRVM',         Icon:Globe,            key:'7' },
]

const NAV_BOTTOM = [
  { href:'/billing',  label:'Abonnement', Icon:CreditCard },
  { href:'/settings', label:'Paramètres', Icon:Settings   },
  { href:'/admin',    label:'Admin',      Icon:Shield     },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  // Raccourcis clavier Ctrl/⌘ + chiffre
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const item = NAV.find(n => n.key === e.key)
      if (item) { e.preventDefault(); router.push(item.href) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className={cn(
      'w-[186px] min-h-screen flex flex-col flex-shrink-0',
      'bg-[var(--fin-panel)] border-r border-[var(--fin-border)]',
    )}>

      {/* Logo */}
      <div className="px-4 py-3 border-b border-[var(--fin-border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-[var(--fin-green)] flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} strokeWidth={2.5} className="text-white"/>
          </div>
          <div>
            <p className="font-bold text-[var(--fin-t1)] text-sm leading-none tracking-tight">InvestSaaS</p>
            <p className="text-[var(--fin-t3)] text-[10px] mt-0.5 font-mono tracking-wider uppercase">Terminal</p>
          </div>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-2 py-2 space-y-px overflow-y-auto">
        <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.1em] px-2 py-1.5 mb-0.5">
          Marchés
        </p>

        {NAV.map(({ href, label, Icon, key }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-medium transition-all group',
                active
                  ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]'
                  : 'text-[var(--fin-t2)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)]'
              )}>
              <Icon size={14} strokeWidth={1.5} className={cn(
                'flex-shrink-0',
                active ? 'text-[var(--fin-blue)]' : 'text-[var(--fin-t3)] group-hover:text-[var(--fin-t2)]'
              )}/>
              <span className="flex-1 truncate">{label}</span>
              <kbd className={cn(
                'hidden group-hover:flex items-center text-[9px] font-mono px-1 py-0.5 rounded',
                'bg-[var(--fin-surface)] text-[var(--fin-t3)] border border-[var(--fin-border)]'
              )}>
                ⌘{key}
              </kbd>
            </Link>
          )
        })}

        <div className="pt-3">
          <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-[0.1em] px-2 py-1.5 mb-0.5">
            Compte
          </p>
          {NAV_BOTTOM.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-medium transition-all group',
                  active
                    ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]'
                    : 'text-[var(--fin-t2)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)]'
                )}>
                <Icon size={14} strokeWidth={1.5} className={cn(
                  'flex-shrink-0',
                  active ? 'text-[var(--fin-blue)]' : 'text-[var(--fin-t3)] group-hover:text-[var(--fin-t2)]'
                )}/>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer upgrade */}
      <div className="px-2 py-2 border-t border-[var(--fin-border)]">
        <Link href="/billing"
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-all',
            'bg-[var(--fin-green-bg)] border border-[var(--fin-green)] border-opacity-30',
            'text-[var(--fin-green)] hover:bg-opacity-80'
          )}>
          <CreditCard size={12} strokeWidth={1.5}/>
          <span className="font-medium">Passer à Pro</span>
        </Link>
      </div>
    </aside>
  )
}
