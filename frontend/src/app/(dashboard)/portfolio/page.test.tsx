import { render, screen, waitFor, act } from '@testing-library/react'
import PortfolioPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }))

// Fonctions stables — si jest.fn() est recréé à chaque rendu, useCallback
// recrée subscribe → load → useEffect boucle infinie sur loading
jest.mock('@/hooks/useWebSocket', () => {
  const subscribe = jest.fn()
  const unsubscribe = jest.fn()
  return { useWebSocket: () => ({ connected: false, subscribe, unsubscribe }) }
})

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

delete (window as any).location
;(window as any).location = { href: '' }

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn(),
}))

const mockPortfolio = {
  id: 'p1', name: 'Mon Portefeuille', holdings: [],
  totalValue: 0, totalCost: 0, totalPnl: 0, totalPnlPct: 0,
}

describe('PortfolioPage', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })
  afterEach(() => jest.useRealTimers())

  it('affiche le spinner de chargement initial', () => {
    ;(api.get as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<PortfolioPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('affiche "Aucun portefeuille" quand la liste est vide', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: [] })
    render(<PortfolioPage />)
    await act(async () => {})
    await waitFor(() =>
      expect(screen.getByText('Aucun portefeuille')).toBeInTheDocument(),
      { timeout: 3000 }
    )
  })

  it('affiche le nom du portefeuille chargé', async () => {
    ;(api.get as jest.Mock)
      .mockResolvedValueOnce({ data: [mockPortfolio] })
      .mockResolvedValueOnce({ data: mockPortfolio })
      .mockResolvedValue({ data: [] })
    render(<PortfolioPage />)
    await act(async () => {})
    await waitFor(() =>
      expect(screen.getByText('Mon Portefeuille')).toBeInTheDocument(),
      { timeout: 3000 }
    )
  })

  it('affiche le message d\'erreur si l\'API échoue', async () => {
    ;(api.get as jest.Mock).mockRejectedValue({ response: { status: 500 } })
    render(<PortfolioPage />)
    await act(async () => {})
    await waitFor(() =>
      expect(screen.getByText('Impossible de charger vos portefeuilles.')).toBeInTheDocument(),
      { timeout: 3000 }
    )
  })
})
