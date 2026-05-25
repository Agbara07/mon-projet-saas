import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
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
import { startBRVMCron } from './services/brvm-cron.service'

// Charge le .env racine en local (Railway injecte les vars directement — no-op si absent)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]
app.use(cors({
  origin: (origin, cb) => {
    // Autorise les requêtes sans origine (curl, Postman, mobile) et les origines Vercel preview
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: origine non autorisée : ${origin}`))
    }
  },
  credentials: true,
}))

// Le webhook Stripe DOIT recevoir le body RAW pour que constructEvent() valide la signature.
// Il faut le monter AVANT app.use(express.json()) qui consommerait le body en premier.
import { handleWebhook } from './controllers/billing.controller'
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook)

app.use(express.json())

// Rate limiting — auth : 20 req/15min, API globale : 200 req/min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { message: 'Trop de requêtes, ralentissez' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/users', apiLimiter, userRoutes)
app.use('/api/billing', apiLimiter, billingRoutes)
app.use('/api/admin', apiLimiter, adminRoutes)
app.use('/api/market', apiLimiter, marketRoutes)
app.use('/api/portfolios', apiLimiter, portfolioRoutes)
app.use('/api/alerts', apiLimiter, alertRoutes)
app.use('/api/watchlist', apiLimiter, watchlistRoutes)
app.use('/api/notes', apiLimiter, notesRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Gestionnaire d'erreurs Express global — évite les crashes sur erreurs non gérées
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err?.message ?? err)
  res.status(500).json({ message: 'Erreur serveur interne', error: err?.message })
})

const server = createServer(app)
initWebSocket(server)
startAlertEngine()
startBRVMCron()

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
