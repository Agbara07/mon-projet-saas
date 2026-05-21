'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {}, setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('investsaas-theme') as Theme | null
    const initial = stored ?? 'dark'
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const applyTheme = (t: Theme) => {
    const html = document.documentElement
    if (t === 'dark') html.classList.add('dark')
    else              html.classList.remove('dark')
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem('investsaas-theme', t)
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
