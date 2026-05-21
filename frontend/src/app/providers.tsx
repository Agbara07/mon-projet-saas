'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ThemeProvider } from '@/lib/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:    60_000,      // données fraîches 1 minute
        gcTime:       5 * 60_000,  // cache gardé 5 minutes
        retry:        2,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom"/>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
