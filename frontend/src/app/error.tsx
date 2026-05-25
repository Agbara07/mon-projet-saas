'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[global-error]', error) }, [error])
  return (
    <html><body>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'sans-serif', gap:16 }}>
        <h2 style={{ fontSize:18, fontWeight:600 }}>Une erreur est survenue</h2>
        <p style={{ fontSize:13, color:'#6b7280' }}>{error?.message ?? 'Erreur inattendue'}</p>
        <button onClick={reset} style={{ padding:'8px 16px', background:'#2563eb', color:'#fff', borderRadius:6, border:'none', cursor:'pointer' }}>
          Réessayer
        </button>
      </div>
    </body></html>
  )
}
