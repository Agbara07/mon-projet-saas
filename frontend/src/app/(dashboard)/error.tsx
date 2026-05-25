'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[dashboard-error]', error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <AlertTriangle size={32} className="text-red-500" strokeWidth={1.5} />
      <h2 className="text-sm font-semibold text-gray-800">Erreur de chargement</h2>
      <p className="text-xs text-gray-500 max-w-xs">{error?.message ?? 'Une erreur inattendue est survenue'}</p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <RefreshCw size={12} />
        Réessayer
      </button>
    </div>
  )
}
