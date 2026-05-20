'use client'

import { useState, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

export interface AlertNotification {
  alertId: string
  symbol: string
  type: string
  condition: string
  threshold: number
  currentValue: number
  message: string
  receivedAt: Date
}

export function useAlerts() {
  const [notifications, setNotifications] = useState<AlertNotification[]>([])

  const { connected } = useWebSocket((msg) => {
    if (msg.type === 'alert') {
      setNotifications((prev) => [
        { ...msg.data, receivedAt: new Date() },
        ...prev.slice(0, 49),
      ])
    }
  })

  const dismiss = useCallback((alertId: string) => {
    setNotifications((prev) => prev.filter((n) => n.alertId !== alertId))
  }, [])

  return { notifications, connected, dismiss }
}
