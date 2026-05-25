import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import alertRoutes from '../routes/alert.routes'
import prisma from '../config/prisma'

process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!'

jest.mock('../config/prisma', () => ({
  alert: {
    findMany:   jest.fn(),
    create:     jest.fn(),
    deleteMany: jest.fn(),
    findFirst:  jest.fn(),
    update:     jest.fn(),
  },
}))

// planGuard contourne le check de quota — on teste le controller, pas le middleware
jest.mock('../middlewares/plan-guard.middleware', () => ({
  planGuard: () => (_req: any, _res: any, next: any) => next(),
}))

const app = express()
app.use(express.json())
app.use('/alerts', alertRoutes)

const token = (userId: string) =>
  jwt.sign({ userId, orgId: 'org-1', role: 'MEMBER' }, process.env.JWT_SECRET!, { expiresIn: '15m' })

const mockAlert = {
  id:        'alert-1',
  symbol:    'AAPL',
  type:      'PRICE',
  condition: 'ABOVE',
  threshold: 200,
  message:   null,
  userId:    'user-1',
  active:    true,
  triggered: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

afterEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════
// GET /alerts
// ═══════════════════════════════════════════════════════════
describe('GET /alerts', () => {
  it('retourne la liste des alertes de l\'utilisateur → 200', async () => {
    ;(prisma.alert.findMany as jest.Mock).mockResolvedValue([mockAlert])

    const res = await request(app).get('/alerts').set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].symbol).toBe('AAPL')
  })

  it('refuse sans token → 401, ne touche pas la BDD', async () => {
    const res = await request(app).get('/alerts')

    expect(res.status).toBe(401)
    expect(prisma.alert.findMany).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /alerts
// ═══════════════════════════════════════════════════════════
describe('POST /alerts', () => {
  it('crée une alerte avec des données valides → 201', async () => {
    ;(prisma.alert.create as jest.Mock).mockResolvedValue(mockAlert)

    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', type: 'PRICE', condition: 'ABOVE', threshold: 200 })

    expect(res.status).toBe(201)
    expect(res.body.symbol).toBe('AAPL')
  })

  it('normalise le symbole en majuscules (aapl → AAPL)', async () => {
    ;(prisma.alert.create as jest.Mock).mockResolvedValue(mockAlert)

    await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'aapl', type: 'PRICE', condition: 'ABOVE', threshold: 200 })

    const createCall = (prisma.alert.create as jest.Mock).mock.calls[0][0]
    expect(createCall.data.symbol).toBe('AAPL')
  })

  it('rejette un threshold négatif → 400', async () => {
    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', type: 'PRICE', condition: 'ABOVE', threshold: -5 })

    expect(res.status).toBe(400)
    expect(prisma.alert.create).not.toHaveBeenCalled()
  })

  it('rejette un type invalide → 400', async () => {
    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', type: 'INVALID', condition: 'ABOVE', threshold: 200 })

    expect(res.status).toBe(400)
    expect(prisma.alert.create).not.toHaveBeenCalled()
  })

  it('rejette une condition invalide → 400', async () => {
    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', type: 'PRICE', condition: 'ENTRE', threshold: 200 })

    expect(res.status).toBe(400)
  })

  it('rejette un body vide → 400', async () => {
    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({})

    expect(res.status).toBe(400)
    expect(prisma.alert.create).not.toHaveBeenCalled()
  })

  it('rejette un symbole vide → 400', async () => {
    const res = await request(app)
      .post('/alerts')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: '', type: 'PRICE', condition: 'ABOVE', threshold: 200 })

    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════
// DELETE /alerts/:id
// ═══════════════════════════════════════════════════════════
describe('DELETE /alerts/:id', () => {
  it('supprime l\'alerte de l\'utilisateur courant → 200', async () => {
    ;(prisma.alert.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await request(app)
      .delete('/alerts/alert-1')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(prisma.alert.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'alert-1', userId: 'user-1' }) })
    )
  })

  it('[SEC-003] IDOR : user-2 ne peut pas supprimer l\'alerte de user-1 → 404', async () => {
    // deleteMany retourne count=0 car la clause userId filtre l'accès
    ;(prisma.alert.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

    const res = await request(app)
      .delete('/alerts/alert-1')
      .set('Authorization', `Bearer ${token('user-2')}`)

    expect(res.status).toBe(404)
    // La requête a bien utilisé userId=user-2, pas user-1
    expect(prisma.alert.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) })
    )
  })

  it('retourne 404 pour un ID inexistant → 404', async () => {
    ;(prisma.alert.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

    const res = await request(app)
      .delete('/alerts/inexistant')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════
// PATCH /alerts/:id/toggle
// ═══════════════════════════════════════════════════════════
describe('PATCH /alerts/:id/toggle', () => {
  it('bascule l\'état actif d\'une alerte → 200', async () => {
    ;(prisma.alert.findFirst as jest.Mock).mockResolvedValue(mockAlert)
    ;(prisma.alert.update as jest.Mock).mockResolvedValue({ ...mockAlert, active: false, triggered: false })

    const res = await request(app)
      .patch('/alerts/alert-1/toggle')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body.active).toBe(false)
    // triggered doit être remis à false lors du toggle
    expect(res.body.triggered).toBe(false)
  })

  it('[SEC-003] IDOR : user-2 ne peut pas toggler l\'alerte de user-1 → 404', async () => {
    ;(prisma.alert.findFirst as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .patch('/alerts/alert-1/toggle')
      .set('Authorization', `Bearer ${token('user-2')}`)

    expect(res.status).toBe(404)
    expect(prisma.alert.update).not.toHaveBeenCalled()
  })
})
