import { Request, Response, NextFunction } from 'express'
import { authenticate, requireAdmin, AuthRequest } from './auth.middleware'
import jwt from 'jsonwebtoken'

jest.mock('jsonwebtoken')

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('authenticate middleware', () => {
  it('bloque une requête sans token', () => {
    const req = { headers: {} } as AuthRequest
    const res = mockRes()
    const next = jest.fn()

    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('passe avec un token valide', () => {
    const payload = { userId: 'u1', orgId: 'o1', role: 'MEMBER' }
    ;(jwt.verify as jest.Mock).mockReturnValue(payload)

    const req = { headers: { authorization: 'Bearer valid_token' } } as AuthRequest
    const res = mockRes()
    const next = jest.fn()

    authenticate(req, res, next)
    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalled()
  })

  it('bloque un token invalide', () => {
    ;(jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid') })

    const req = { headers: { authorization: 'Bearer bad_token' } } as AuthRequest
    const res = mockRes()
    const next = jest.fn()

    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

describe('requireAdmin middleware', () => {
  it('laisse passer un ADMIN', () => {
    const req = { user: { userId: 'u1', orgId: 'o1', role: 'ADMIN' } } as AuthRequest
    const res = mockRes()
    const next = jest.fn()

    requireAdmin(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('bloque un MEMBER', () => {
    const req = { user: { userId: 'u1', orgId: 'o1', role: 'MEMBER' } } as AuthRequest
    const res = mockRes()
    const next = jest.fn()

    requireAdmin(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
