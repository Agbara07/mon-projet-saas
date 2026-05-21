'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3, Eye, Search,
  CalendarDays, Bell, CreditCard, Settings, Shield, TrendingUp,
  Globe,
} from 'lucide-react'

const NAV = [
  { href:'/dashboard', label:'Dashboard',    Icon:LayoutDashboard },
  { href:'/portfolio', label:'Portefeuille', Icon:BarChart3       },
  { href:'/watchlist', label:'Watchlist',    Icon:Eye             },
  { href:'/screener',  label:'Screener',     Icon:Search          },
  { href:'/calendar',  label:'Calendrier',   Icon:CalendarDays    },
  { href:'/alerts',    label:'Alertes',      Icon:Bell            },
  { href:'/brvm',      label:'BRVM',         Icon:Globe           },
]

const NAV_ACCOUNT = [
  { href:'/billing',  label:'Abonnement', Icon:CreditCard },
  { href:'/settings', label:'Paramètres', Icon:Settings   },
  { href:'/admin',    label:'Admin',      Icon:Shield     },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-green-200 group-hover:shadow-green-300 transition-shadow">
            <TrendingUp size={18} className="text-white"/>
          </div>
          <div>
            <p className="font-black text-gray-900 text-base leading-none">InvestSaaS</p>
            <p className="text-gray-400 text-xs mt-0.5">Plateforme d'investissement</p>
          </div>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Marché</p>
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}>
              <Icon size={17} className={cn(
                'flex-shrink-0 transition-colors',
                active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              )}/>
              {label}
              {href === '/alerts' && (
                <span className="ml-auto w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center">
                  •
                </span>
              )}
            </Link>
          )
        })}

        <div className="pt-4 pb-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Compte</p>
          {NAV_ACCOUNT.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}>
                <Icon size={17} className={cn(
                  'flex-shrink-0',
                  active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                )}/>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
          <p className="text-xs font-bold text-blue-700 mb-0.5">Plan gratuit</p>
          <p className="text-xs text-blue-500 mb-2">Passez à Gold pour les données temps réel</p>
          <Link href="/billing"
            className="block text-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-1.5 rounded-lg transition-colors">
            Passer à Gold →
          </Link>
        </div>
      </div>
    </aside>
  )
}
