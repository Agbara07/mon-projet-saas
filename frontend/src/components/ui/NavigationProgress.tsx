'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

// Config nprogress
NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.08 })

function ProgressTracker() {
  const pathname   = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  return null
}

export function NavigationProgress() {
  return (
    <>
      <style>{`
        #nprogress .bar {
          background: #2563eb;
          position: fixed;
          z-index: 9999;
          top: 0; left: 0;
          width: 100%; height: 2.5px;
        }
        #nprogress .peg {
          display: block;
          position: absolute;
          right: 0; width: 100px; height: 100%;
          box-shadow: 0 0 10px #2563eb, 0 0 5px #2563eb;
          opacity: 1;
          transform: rotate(3deg) translate(0, -4px);
        }
      `}</style>
      <Suspense fallback={null}>
        <ProgressTracker />
      </Suspense>
    </>
  )
}

/* Déclencher manuellement depuis les Link onClick */
export const startProgress = () => NProgress.start()
export const doneProgress  = () => NProgress.done()
