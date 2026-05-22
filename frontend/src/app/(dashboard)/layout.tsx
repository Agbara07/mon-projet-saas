'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Bell, ChevronDown, LogOut, Command, Menu } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, trialActive, trialDaysLeft } = useCurrentUser()
  const [showMenu,    setShowMenu]    = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const cmd    = useCommandPalette()

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--fin-bg)' }}>
      <NavigationProgress />
      <CommandPalette open={cmd.open} onClose={cmd.close} />

      <a href="#main-content" className="skip-to-main">
        Aller au contenu principal
      </a>

      <Sidebar
        user={user}
        trialActive={trialActive}
        trialDaysLeft={trialDaysLeft}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header
          role="banner"
          className={cn(
            'flex items-center gap-3 px-4 h-9 flex-shrink-0',
            'bg-[var(--fin-panel)] border-b border-[var(--fin-border)]',
          )}
        >
          {/* Hamburger — mobile uniquement */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-drawer"
            className={cn(
              'lg:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              'text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)]',
            )}
          >
            <Menu size={15}/>
          </button>

          {/* Cmd+K — desktop */}
          <button
            onClick={() => cmd.setOpen(true)}
            aria-label="Ouvrir la palette de commandes (Ctrl+K)"
            aria-keyshortcuts="Control+k Meta+k"
            className={cn(
              'hidden md:flex items-center gap-2 h-7 px-3 rounded text-[11px]',
              'bg-[var(--fin-surface)] border border-[var(--fin-border)]',
              'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] hover:border-[var(--fin-border-2)]',
              'transition-colors w-52'
            )}>
            <span className="flex-1 text-left">Rechercher ou naviguer…</span>
            <span className="flex items-center gap-0.5">
              <kbd className="flex items-center justify-center w-4 h-4 text-[9px] bg-[var(--fin-hover)] border border-[var(--fin-border)] rounded font-mono">
                <Command size={8}/>
              </kbd>
              <kbd className="flex items-center justify-center w-4 h-4 text-[9px] bg-[var(--fin-hover)] border border-[var(--fin-border)] rounded font-mono">K</kbd>
            </span>
          </button>

          <div className="flex-1"/>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            <Link href="/alerts"
              aria-label="Alertes"
              className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                'text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)]',
                'border border-transparent hover:border-[var(--fin-border)]'
              )}>
              <Bell size={14} strokeWidth={1.5}/>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--fin-red)] rounded-full" aria-hidden="true"/>
            </Link>

            {/* User menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  aria-label="Menu utilisateur"
                  aria-expanded={showMenu}
                  aria-haspopup="menu"
                  className={cn(
                    'flex items-center gap-2 h-8 pl-2 pr-1.5 rounded-lg transition-colors',
                    'border border-[var(--fin-border)] hover:border-[var(--fin-border-2)]',
                    'hover:bg-[var(--fin-hover)]',
                  )}>
                  <div className="w-5 h-5 rounded bg-[var(--fin-blue)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" aria-hidden="true">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                  <span className="text-[var(--fin-t2)] text-xs font-medium hidden sm:block">
                    {user.name?.split(' ')[0] || user.email.split('@')[0]}
                  </span>
                  <ChevronDown size={11} className={cn('text-[var(--fin-t3)] transition-transform', showMenu && 'rotate-180')}/>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} aria-hidden="true"/>
                    <div
                      role="menu"
                      aria-label="Menu utilisateur"
                      className={cn(
                        'absolute right-0 top-full mt-1 w-52 z-50 overflow-hidden rounded-lg',
                        'bg-[var(--fin-panel)] border border-[var(--fin-border)]',
                        'shadow-2xl shadow-black/30'
                      )}>
                      <div className="px-3 py-2.5 border-b border-[var(--fin-border)]">
                        <p className="font-semibold text-[var(--fin-t1)] text-xs">{user.name}</p>
                        <p className="text-[var(--fin-t3)] text-[10px] truncate font-mono">{user.email}</p>
                        <p className="text-[10px] mt-1">
                          <span className={cn('font-bold font-mono',
                            user.organization?.plan === 'FREE' ? 'text-[var(--fin-t3)]' : 'text-[var(--fin-amber)]'
                          )}>
                            {user.organization?.name} · {user.organization?.plan}
                          </span>
                        </p>
                      </div>
                      <div className="p-1" role="group">
                        {[
                          { href:'/billing',  label:'Abonnement' },
                          { href:'/settings', label:'Paramètres' },
                          ...(isAdmin ? [{ href:'/admin', label:'Administration' }] : []),
                        ].map(({ href, label }) => (
                          <Link key={href} href={href} role="menuitem" onClick={() => setShowMenu(false)}
                            className={cn(
                              'flex items-center px-3 py-1.5 text-xs text-[var(--fin-t2)] rounded',
                              'hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)] transition-colors'
                            )}>
                            {label}
                          </Link>
                        ))}
                        <hr className="my-1 border-[var(--fin-border)]" role="separator"/>
                        <button
                          role="menuitem"
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--fin-red)] hover:bg-[var(--fin-red-bg)] rounded transition-colors">
                          <LogOut size={12} strokeWidth={1.5}/> Se déconnecter
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main id="main-content" role="main" className="flex-1 overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
