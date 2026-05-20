import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import billingRoutes from './routes/billing.routes'
import adminRoutes from './routes/admin.routes'
import marketRoutes from './routes/market.routes'
import portfolioRoutes from './routes/portfolio.routes'
import alertRoutes from './routes/alert.routes'
import watchlistRoutes from './routes/watchlist.routes'
import notesRoutes from './routes/notes.routes'
import { initWebSocket } from './services/websocket.service'
import { startAlertEngine } from './services/alert.service'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/portfolios', portfolioRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/notes', notesRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Gestionnaire d'erreurs Express global — évite les crashes sur erreurs non gérées
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err?.message ?? err)
  res.status(500).json({ message: 'Erreur serveur interne', error: err?.message })
})

const server = createServer(app)
initWebSocket(server)
startAlertEngine()

// Empêche le crash sur promesses rejetées non gérées (ex: Yahoo Finance timeout)
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket on ws://localhost:${PORT}/ws`)
})
