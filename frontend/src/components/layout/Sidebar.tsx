'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href:'/dashboard', label:'Dashboard',    icon:'🏠' },
  { href:'/portfolio', label:'Portefeuille', icon:'📊' },
  { href:'/watchlist', label:'Watchlist',    icon:'👁' },
  { href:'/screener',  label:'Screener',     icon:'🔍' },
  { href:'/calendar',  label:'Calendrier',   icon:'📅' },
  { href:'/alerts',    label:'Alertes',      icon:'🔔' },
  { section:true, label:'Compte' },
  { href:'/billing',   label:'Abonnement',   icon:'💳' },
  { href:'/settings',  label:'Paramètres',   icon:'⚙️' },
  { href:'/admin',     label:'Admin',        icon:'🛡️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-zinc-900 text-zinc-300 flex flex-col py-6 px-3 flex-shrink-0 border-r border-zinc-800">
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center font-black text-black text-sm shadow-md">I</div>
          <span className="text-white font-bold text-base">InvestSaaS</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map((item, i) => {
          if ('section' in item) {
            return (
              <p key={i} className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-3 pt-4 pb-1">
                {item.label}
              </p>
            )
          }
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href!))
          return (
            <Link key={item.href} href={item.href!}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                active
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              )}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">© 2025 InvestSaaS</p>
      </div>
    </aside>
  )
}
