/** Vérifie si le marché US (NYSE/NASDAQ) est actuellement ouvert. */
export function isUsMarketOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay() // 0=dim, 6=sam
  if (day === 0 || day === 6) return false

  // NYSE : 09:30–16:00 ET = 14:30–21:00 UTC (hors heure d'été)
  // Approximation UTC sans gestion DST complète
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return utcMinutes >= 14 * 60 + 30 && utcMinutes < 21 * 60
}

export function marketStatusLabel(): { open: boolean; label: string } {
  const open = isUsMarketOpen()
  return {
    open,
    label: open ? 'MARCHÉ OUVERT' : 'MARCHÉ FERMÉ',
  }
}
