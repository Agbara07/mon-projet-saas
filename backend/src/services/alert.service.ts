import cron from 'node-cron'
import prisma from '../config/prisma'
import { getQuotes } from './market.service'
import { broadcastAlert } from './websocket.service'

export function startAlertEngine() {
  // Évalue les alertes toutes les minutes
  cron.schedule('* * * * *', async () => {
    const alerts = await prisma.alert.findMany({
      where: { active: true, triggered: false },
    })
    if (alerts.length === 0) return

    const symbols = [...new Set(alerts.map((a) => a.symbol))]
    const quotes = await getQuotes(symbols)
    const priceMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]))

    for (const alert of alerts) {
      const quote = priceMap[alert.symbol]
      if (!quote) continue

      const value = alert.type === 'PRICE'
        ? quote.price
        : alert.type === 'PERCENT_CHANGE'
        ? quote.changePercent
        : quote.volume

      const triggered =
        alert.condition === 'ABOVE' ? value > alert.threshold : value < alert.threshold

      if (triggered) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { triggered: true, triggeredAt: new Date(), active: false },
        })

        broadcastAlert(alert.userId, {
          alertId: alert.id,
          symbol: alert.symbol,
          type: alert.type,
          condition: alert.condition,
          threshold: alert.threshold,
          currentValue: value,
          message: alert.message ?? `${alert.symbol} a dépassé ${alert.threshold}`,
        })
      }
    }
  })
}
