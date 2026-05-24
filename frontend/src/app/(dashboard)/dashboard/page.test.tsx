import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn() }))
jest.mock('@/components/terminal/MarketPulseWidget', () => () => (
  <div data-testid="market-pulse-widget" />
))

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockUser = {
  id: 'u1',
  name: 'Marie Dupont',
  email: 'marie@acme.com',
  role: 'OWNER',
  organization: { name: 'Acme Capital', plan: 'PRO' },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    ;(api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockUser })  // /users/me
      .mockResolvedValueOnce({ data: [] })         // /market/overview
      .mockResolvedValueOnce({ data: [] })         // /market/earnings
      .mockResolvedValueOnce({ data: [] })         // /watchlist
      .mockResolvedValueOnce({ data: [] })         // /market/SPY/historical
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('affiche le dashboard immédiatement sans spinner bloquant', async () => {
    const { container } = render(<DashboardPage />)
    // Le dashboard est directement visible — les sections ont leurs propres skeletons
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()

    // Les données utilisateur apparaissent dès que la promesse résout
    await waitFor(() => expect(screen.getByText(/Acme Capital/i)).toBeInTheDocument())
  })

  it("affiche le plan de l'organisation", async () => {
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getByText('PRO')).toBeInTheDocument())
  })
})
