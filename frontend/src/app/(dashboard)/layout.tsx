'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Bell, Search, ChevronDown, LogOut, Command } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette'
import { NavigationProgress } from '@/components/ui/NavigationProgress'

interface User { name: string; email: string; role: string; organization: { name: string; plan: string } }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const cmd    = useCommandPalette()

  useEffect(() => {
    api.get('/users/me').then(r => setUser(r.data)).catch(() => {})
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f5f6fa]">
      <NavigationProgress />
      <CommandPalette open={cmd.open} onClose={cmd.close} />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-sm">

          {/* Cmd+K trigger */}
          <button
            onClick={() => cmd.setOpen(true)}
            className="hidden md:flex items-center gap-3 w-72 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-gray-100 hover:border-gray-300 transition-colors group"
          >
            <Search size={13} className="flex-shrink-0"/>
            <span className="flex-1 text-left">Rechercher ou naviguer…</span>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded font-mono shadow-sm group-hover:border-gray-300 transition-colors">
                <Command size={10} className="inline"/>
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded font-mono shadow-sm group-hover:border-gray-300 transition-colors">K</kbd>
            </div>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notif */}
            <Link href="/alerts" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell size={18}/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
            </Link>

            {/* User menu */}
            {user && (
              <div className="relative">
                <button onClick={() => setShowMenu(v => !v)}
                  className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900 leading-none">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user.organization?.plan ?? 'FREE'}</p>
                  </div>
                  <ChevronDown size={14} className={cn('text-gray-400 transition-transform', showMenu && 'rotate-180')}/>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}/>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                        <p className="text-xs mt-1">
                          <span className={cn('font-bold', user.organization?.plan === 'FREE' ? 'text-gray-500' : 'text-amber-600')}>
                            {user.organization?.name} · {user.organization?.plan}
                          </span>
                        </p>
                      </div>
                      <div className="p-1.5">
                        {[
                          { href:'/billing',  label:'Mon abonnement' },
                          { href:'/settings', label:'Paramètres' },
                          { href:'/admin',    label:'Administration' },
                        ].map(({ href, label }) => (
                          <Link key={href} href={href} onClick={() => setShowMenu(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                            {label}
                          </Link>
                        ))}
                        <button onClick={logout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1 border-t border-gray-100 pt-2">
                          <LogOut size={14}/> Se déconnecter
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
