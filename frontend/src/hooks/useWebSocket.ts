'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface WsMessage {
  type: string
  data?: any
  symbols?: string[]
}

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const url = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'}/ws?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)
    ws.current.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch { /* ignore */ }
    }

    return () => ws.current?.close()
  }, [])

  const subscribe = useCallback((symbols: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', symbols }))
    }
  }, [])

  const unsubscribe = useCallback((symbols: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'unsubscribe', symbols }))
    }
  }, [])

  return { connected, subscribe, unsubscribe }
}
