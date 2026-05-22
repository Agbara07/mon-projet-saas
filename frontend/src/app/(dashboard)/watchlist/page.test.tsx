import { render, screen, waitFor, act } from '@testing-library/react'
import WatchlistPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }))
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connected: false, subscribe: jest.fn(), unsubscribe: jest.fn() }),
}))
jest.mock('@/components/ui/Sparkline', () => ({
  Sparkline: () => null,
  generateSparkline: () => [],
}))

const mockItems = [
  { id: 'w1', symbol: 'AAPL', companyName: 'Apple Inc.', addedAt: '2024-01-01',
    quote: { price: 213.42, change: 2.1, changePercent: 1.24, volume: 50000000 } },
  { id: 'w2', symbol: 'TSLA', companyName: 'Tesla', addedAt: '2024-01-02',
    quote: { price: 248.5, change: -2.8, changePercent: -1.12, volume: 30000000 } },
]

describe('WatchlistPage', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers() })

  it('affiche le spinner pendant le chargement', () => {
    ;(api.get as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<WatchlistPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('affiche les symboles de la watchlist', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockItems })
    render(<WatchlistPage />)
    await act(async () => {})
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('TSLA')).toBeInTheDocument()
    })
  })

  it('affiche l\'état vide "Watchlist vide"', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: [] })
    render(<WatchlistPage />)
    await act(async () => {})
    await waitFor(() =>
      expect(screen.getByText('Watchlist vide')).toBeInTheDocument()
    )
  })

  it('affiche les prix des titres', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockItems })
    render(<WatchlistPage />)
    await act(async () => {})
    // Le prix peut être dans un span imbriqué — on cherche dans le DOM complet
    await waitFor(() =>
      expect(screen.getByText((content) => content.includes('213.42'))).toBeInTheDocument()
    )
  })
})
