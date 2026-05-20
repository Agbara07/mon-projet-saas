import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number, currency = 'USD', decimals = 2) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: decimals }).format(n)
}

export function formatNumber(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)}Md`
  if (n >= 1e6)  return `${(n / 1e6).toFixed(2)}M`
  return n.toLocaleString('fr-FR')
}

export function formatPct(n: number, decimals = 2) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}
