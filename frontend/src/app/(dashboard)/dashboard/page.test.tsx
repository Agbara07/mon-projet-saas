import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn() }))

const mockUser = {
  id: 'u1',
  name: 'Marie Dupont',
  email: 'marie@acme.com',
  role: 'OWNER',
  organization: { name: 'Acme Capital', plan: 'PRO' },
}

describe('DashboardPage', () => {
  it('affiche le chargement puis les données utilisateur', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockUser })
    render(<DashboardPage />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Bonjour, Marie Dupont')).toBeInTheDocument()
      expect(screen.getByText('Acme Capital — Plan PRO')).toBeInTheDocument()
    })
  })

  it('affiche le rôle et le plan', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockUser })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('OWNER')).toBeInTheDocument()
      expect(screen.getAllByText('PRO').length).toBeGreaterThan(0)
    })
  })
})
