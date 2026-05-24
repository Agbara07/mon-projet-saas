// Federal Reserve Economic Data (FRED) — https://fred.stlouisfed.org
// Clé gratuite sur https://fred.stlouisfed.org/docs/api/api_key.html

const BASE = 'https://api.stlouisfed.org/fred/series/observations'

export interface MacroIndicator {
  id:       string
  name:     string
  value:    number
  unit:     string
  date:     string
  change?:  number   // variation vs période précédente (même unité)
  yoy?:     number   // variation an/an en %
  trend:    'up' | 'down' | 'stable'
  history:  { date: string; value: number }[]  // 12 dernières périodes
}

export interface USMacroDashboard {
  updatedAt:  string
  indicators: MacroIndicator[]
}

/* ── Fetch brut FRED ────────────────────────────────────────────── */
async function fredFetch(seriesId: string, limit = 26): Promise<{ date: string; value: string }[]> {
  const KEY = process.env.FRED_API_KEY ?? ''
  if (!KEY) throw new Error('FRED_API_KEY manquante — clé gratuite sur fred.stlouisfed.org')
  const url = `${BASE}?series_id=${seriesId}&api_key=${KEY}&file_type=json&limit=${limit}&sort_order=desc`
  const r = await fetch(url, {
    headers: { 'User-Agent': 'InvestSaaS/1.0' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (!r.ok) throw new Error(`FRED HTTP ${r.status} pour ${seriesId}`)
  const data = await r.json() as { observations: { date: string; value: string }[] }
  return data.observations.filter(o => o.value !== '.')
}

function toNum(s: string): number { return parseFloat(s) }

function buildIndicator(
  id:   string,
  name: string,
  unit: string,
  obs:  { date: string; value: string }[],
  yoyMode = false,  // si true, calcule le YoY à la place de la variation simple
): MacroIndicator {
  const nums    = obs.map(o => ({ date: o.date, value: toNum(o.value) }))
  const history = nums.slice(0, 12).reverse()  // les 12 derniers, ordre chrono
  const current = nums[0]
  const prev    = nums[1]
  const prevYear = nums[12] ?? nums[nums.length - 1]

  const change  = prev    ? current.value - prev.value                          : undefined
  const yoy     = yoyMode && prevYear
    ? ((current.value - prevYear.value) / Math.abs(prevYear.value)) * 100
    : undefined

  const delta   = yoyMode ? (yoy ?? 0) : (change ?? 0)
  const trend   = Math.abs(delta) < 0.05 ? 'stable' : delta > 0 ? 'up' : 'down'

  return { id, name, value: current.value, unit, date: current.date, change, yoy, trend, history }
}

/* ── API publique ───────────────────────────────────────────────── */
export async function getUSMacroDashboard(): Promise<USMacroDashboard> {
  const [fedRaw, cpiRaw, unRaw, dgsRaw, gdpRaw] = await Promise.allSettled([
    fredFetch('FEDFUNDS',            26),  // Taux directeur Fed (mensuel)
    fredFetch('CPIAUCSL',            26),  // CPI All Items (mensuel)
    fredFetch('UNRATE',              26),  // Taux chômage (mensuel)
    fredFetch('DGS10',               26),  // Rendement T-Note 10 ans (journalier → on prend le dernier)
    fredFetch('A191RL1Q225SBEA',     10),  // PIB réel croissance (trimestriel)
  ])

  const indicators: MacroIndicator[] = []

  if (fedRaw.status === 'fulfilled') {
    indicators.push(buildIndicator('FEDFUNDS', 'Taux Fed Funds', '%', fedRaw.value))
  }

  if (cpiRaw.status === 'fulfilled') {
    const ind = buildIndicator('CPIAUCSL', 'Inflation CPI', '%/an', cpiRaw.value, true)
    // On affiche le YoY comme valeur principale
    if (ind.yoy != null) ind.value = Math.round(ind.yoy * 100) / 100
    indicators.push(ind)
  }

  if (unRaw.status === 'fulfilled') {
    indicators.push(buildIndicator('UNRATE', 'Taux de chômage', '%', unRaw.value))
  }

  if (dgsRaw.status === 'fulfilled') {
    // Données journalières — on prend les 12 derniers jours disponibles
    const monthly = dgsRaw.value.filter((_, i) => i % 20 === 0).slice(0, 12)
    const all     = [...dgsRaw.value.slice(0, 1), ...monthly]
    indicators.push(buildIndicator('DGS10', 'T-Note 10 ans', '%', all))
  }

  if (gdpRaw.status === 'fulfilled') {
    indicators.push(buildIndicator('A191RL1Q225SBEA', 'Croissance PIB réel', '%', gdpRaw.value))
  }

  return { updatedAt: new Date().toISOString(), indicators }
}
