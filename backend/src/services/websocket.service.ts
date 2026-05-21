import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import jwt from 'jsonwebtoken'
import { marketRouter } from './market/market-router'

interface Client {
  ws: WebSocket
  userId: string
  subscriptions: Set<string>
}

const clients = new Map<string, Client>()

export function initWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url!, `http://localhost`).searchParams.get('token')
    if (!token) { ws.close(1008, 'Token requis'); return }

    let userId: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      userId = payload.userId
    } catch {
      ws.close(1008, 'Token invalide')
      return
    }

    const clientId = `${userId}-${Date.now()}`
    clients.set(clientId, { ws, userId, subscriptions: new Set() })

    ws.send(JSON.stringify({ type: 'connected', userId }))

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        const client = clients.get(clientId)!
        if (msg.type === 'subscribe' && msg.symbols) {
          (msg.symbols as string[]).forEach((s: string) => client.subscriptions.add(s.toUpperCase()))
          ws.send(JSON.stringify({ type: 'subscribed', symbols: [...client.subscriptions] }))
        }
        if (msg.type === 'unsubscribe' && msg.symbols) {
          (msg.symbols as string[]).forEach((s: string) => client.subscriptions.delete(s.toUpperCase()))
        }
      } catch { /* invalid JSON */ }
    })

    ws.on('close', () => clients.delete(clientId))
  })

  // Push des prix toutes les 30s aux clients connectés
  setInterval(async () => {
    const allSymbols = new Set<string>()
    clients.forEach((c) => c.subscriptions.forEach((s) => allSymbols.add(s)))
    if (allSymbols.size === 0) return

    try {
      const quotes = await marketRouter.getQuotes([...allSymbols])
      const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]))

      clients.forEach((client) => {
        if (client.ws.readyState !== WebSocket.OPEN) return
        const relevant = quotes.filter((q) => client.subscriptions.has(q.symbol))
        if (relevant.length > 0) {
          client.ws.send(JSON.stringify({ type: 'quotes', data: relevant }))
        }
      })
    } catch { /* Yahoo Finance error — skip cycle */ }
  }, 30_000)

  return wss
}

export function broadcastAlert(userId: string, alert: object) {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: 'alert', data: alert }))
    }
  })
}
