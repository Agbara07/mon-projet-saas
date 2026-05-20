import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import Providers from './providers'
import './globals.css'

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
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <Providers>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
        </Providers>
      </body>
    </html>
  )
}
