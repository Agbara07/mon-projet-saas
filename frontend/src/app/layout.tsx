import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Providers from './providers'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300','400','500','600','700','800','900'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400','500','600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'InvestSaaS — Investissez intelligemment',
  description: 'Plateforme d\'investissement temps réel. Portfolio tracker, screener, alertes, calendrier des résultats.',
  keywords: ['investissement', 'bourse', 'portfolio', 'screener', 'alertes', 'trading'],
  authors: [{ name: 'InvestSaaS' }],
  openGraph: {
    title: 'InvestSaaS',
    description: 'La plateforme d\'investissement nouvelle génération',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning évite le crash React quand ThemeProvider
    // modifie className="dark" côté client après le rendu serveur
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
        <Providers>
          {children}
          <UpgradeModal />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--fin-panel)',
                border: '1px solid var(--fin-border-2)',
                color: 'var(--fin-t1)',
                borderRadius: '12px',
                fontSize: '13px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
