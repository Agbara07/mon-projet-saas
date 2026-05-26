import axios from 'axios'

// ── GET cache in-memory (survives tab navigation, resets on page reload) ──────
const _cache = new Map<string, { data: unknown; exp: number }>()

const TTL: [RegExp, number][] = [
  [/\/users\/me/,          120_000],  // user session — 2 min
  [/\/market\/overview/,    30_000],  // indices — 30 s
  [/\/market\/earnings/,   300_000],  // calendar — 5 min
  [/\/watchlist/,           30_000],  // watchlist — 30 s
  [/\/market\/brvm\b/,      60_000],  // BRVM quotes — 1 min
  [/\/historical/,          60_000],  // historical — 1 min
  [/\/brvm\/tools\//,      300_000],  // BRVM tools — 5 min
  [/\/macro\//,            300_000],  // macro — 5 min
  [/\/euronext$/,           30_000],  // euronext overview — 30 s
  [/\/euronext\/stocks/,    60_000],  // CAC40 stocks — 1 min
  [/\/euronext\//,         120_000],  // indices/forex/commodities — 2 min
]

function ttlFor(url: string): number {
  for (const [re, ms] of TTL) if (re.test(url)) return ms
  return 0
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
})

// Intercept GET responses to populate cache
api.interceptors.response.use((res) => {
  if (res.config.method === 'get') {
    const ttl = ttlFor(res.config.url ?? '')
    if (ttl > 0) _cache.set(res.config.url!, { data: res.data, exp: Date.now() + ttl })
  }
  return res
})

// Intercept GET requests to return cached data when fresh
const originalGet = api.get.bind(api)
;(api as any).get = async function (url: string, config?: any) {
  const ttl = ttlFor(url)
  if (ttl > 0) {
    const hit = _cache.get(url)
    if (hit && Date.now() < hit.exp) return { data: hit.data }
  }
  return originalGet(url, config)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'PLAN_LIMIT_REACHED') {
      window.dispatchEvent(new CustomEvent('plan:limit-reached', { detail: error.response.data }))
      return Promise.reject(error)
    }

    // Ne pas intercepter les 401 des routes auth — laisser le formulaire gérer l'erreur
    const url = error.config?.url ?? ''
    const isAuthRoute = /\/auth\/(login|register|refresh)/.test(url)

    if (error.response?.status === 401 && !isAuthRoute) {
      const refresh = localStorage.getItem('refreshToken')
      if (refresh) {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('accessToken', data.accessToken)
          error.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(error.config)
        } catch {
          // Refresh échoué → déconnexion propre
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return Promise.reject(error)
        }
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
