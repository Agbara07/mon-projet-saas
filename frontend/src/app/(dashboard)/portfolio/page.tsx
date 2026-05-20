'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Trash2, Wallet,
  BarChart3, PieChartIcon, ArrowUpRight, Zap, RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn, formatPct } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Progress } from '@/components/ui/Progress'
import { PageLoader } from '@/components/ui/Spinner'
import Link from 'next/link'
import { toast } from 'sonner'

interface Holding {
  id: string; symbol: string; companyName: string
  quantity: number; avgBuyPrice: number
  currentPrice: number; value: number; pnl: number; pnlPct: number
}
interface Portfolio {
  id: string; name: string; holdings: Holding[]
  totalValue: number; totalCost: number; totalPnl: number; totalPnlPct: number
}
interface HistPoint { date: string; close: number }

const PERIODS = ['1d','5d','1mo','3mo','6mo','1y','5y'] as const
type Period = typeof PERIODS[number]
const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-gray-900 font-bold">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function PortfolioPage() {
  const [portfolios, setPortfolios]   = useState<Portfolio[]>([])
  const [selected, setSelected]       = useState<Portfolio | null>(null)
  const [history, setHistory]         = useState<HistPoint[]>([])
  const [period, setPeriod]           = useState<Period>('1mo')
  const [liveQuotes, setLiveQuotes]   = useState<Record<string, number>>({})
  const [showNew, setShowNew]         = useState(false)
  const [showHolding, setShowHolding] = useState(false)
  const [newName, setNewName]         = useState('')
  const [newH, setNewH]               = useState({ symbol:'', quantity:'', avgBuyPrice:'', companyName:'' })
  const [loading, setLoading]         = useState(true)

  const { connected, subscribe } = useWebSocket(msg => {
    if (msg.type === 'quotes') {
      const m: Record<string,number> = {}
      msg.data.forEach((q: any) => { m[q.symbol] = q.price })
      setLiveQuotes(p => ({ ...p, ...m }))
    }
  })

  const load = useCallback(async () => {
    const r = await api.get('/portfolios')
    setPortfolios(r.data)
    setLoading(false)
    if (r.data.length > 0 && !selected) loadPortfolio(r.data[0].id)
  }, [])

  const loadPortfolio = async (id: string) => {
    const r = await api.get(`/portfolios/${id}`)
    setSelected(r.data)
    if (r.data.holdings.length > 0) subscribe(r.data.holdings.map((h: Holding) => h.symbol))
    const hist = await api.get(`/market/${r.data.holdings[0]?.symbol ?? 'AAPL'}/historical?period=${period}`)
    setHistory(hist.data)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!selected?.holdings[0]) return
    api.get(`/market/${selected.holdings[0].symbol}/historical?period=${period}`).then(r => setHistory(r.data))
  }, [period, selected?.id])

  const createPortfolio = async () => {
    if (!newName.trim()) return
    await api.post('/portfolios', { name: newName })
    toast.success('Portefeuille créé')
    setNewName(''); setShowNew(false); load()
  }

  const addHolding = async () => {
    if (!selected || !newH.symbol || !newH.quantity || !newH.avgBuyPrice) return
    await api.post(`/portfolios/${selected.id}/holdings`, {
      symbol: newH.symbol.toUpperCase(), quantity: Number(newH.quantity),
      avgBuyPrice: Number(newH.avgBuyPrice), companyName: newH.companyName,
    })
    toast.success(`${newH.symbol.toUpperCase()} ajouté`)
    setNewH({ symbol:'', quantity:'', avgBuyPrice:'', companyName:'' })
    setShowHolding(false); loadPortfolio(selected.id)
  }

  const removeHolding = async (portfolioId: string, holdingId: string, symbol: string) => {
    await api.delete(`/portfolios/${portfolioId}/holdings/${holdingId}`)
    toast.success(`${symbol} supprimé`)
    loadPortfolio(portfolioId)
  }

  if (loading) return <PageLoader />

  const totalLive = selected?.holdings.reduce((s, h) =>
    s + (liveQuotes[h.symbol] ?? h.currentPrice) * h.quantity, 0) ?? 0

  const pieData = selected?.holdings.map((h, i) => ({
    name: h.symbol,
    value: (liveQuotes[h.symbol] ?? h.currentPrice) * h.quantity,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? []

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* ── Header ────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Wallet size={22} className="text-blue-500" /> Portefeuille
          </h1>
          <Badge variant={connected ? 'green' : 'white'} className="mt-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400')} />
            {connected ? 'Temps réel' : 'Hors ligne'}
          </Badge>
        </div>
        <Button variant="brand" leftIcon={<Plus size={15}/>} onClick={() => setShowNew(true)}>
          Nouveau portefeuille
        </Button>
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────── */}
      {portfolios.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {portfolios.map(p => (
            <button key={p.id} onClick={() => loadPortfolio(p.id)}
              className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                selected?.id === p.id
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {p.name}
            </button>
          ))}
        </motion.div>
      )}

      {selected ? (
        <AnimatePresence mode="wait">
          <motion.div key={selected.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:.3 }} className="space-y-5">

            {/* ── Stats ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label:'Valeur totale',    value:`$${totalLive.toLocaleString('fr-FR',{minimumFractionDigits:2})}`,  change:undefined, color:'text-gray-900' },
                { label:'Investi',          value:`$${selected.totalCost.toLocaleString('fr-FR',{minimumFractionDigits:2})}`, change:undefined, color:'text-gray-600' },
                { label:'P&L total',        value:`${selected.totalPnl>=0?'+':''}$${Math.abs(selected.totalPnl).toFixed(2)}`, change:undefined, color:selected.totalPnl>=0?'text-green-600':'text-red-500' },
                { label:'Performance',      value:`${formatPct(selected.totalPnlPct)}`, change:undefined, color:selected.totalPnlPct>=0?'text-green-600':'text-red-500' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}>
                  <Card className="p-4">
                    <p className="text-gray-500 text-xs font-medium mb-1">{s.label}</p>
                    <p className={cn('text-xl font-black tabular-nums', s.color)}>{s.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* ── Chart + Pie ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 size={15} className="text-blue-500"/>
                    {selected.holdings[0]?.symbol ?? 'Historique'}
                  </p>
                  <div className="flex gap-1">
                    {PERIODS.map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={cn('text-xs px-2 py-1 rounded-lg font-medium transition-colors',
                          period===p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history} margin={{ top:4, right:4, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={false}
                      tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                    <YAxis tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={false}
                      domain={['auto','auto']} tickFormatter={v=>`$${v}`} width={52}/>
                    <Tooltip content={<TooltipContent/>}/>
                    <Area type="monotone" dataKey="close" stroke="#22c55e" strokeWidth={2}
                      fill="url(#pg)" dot={false} activeDot={{r:4,fill:'#22c55e',strokeWidth:0}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <p className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <PieChartIcon size={15} className="text-purple-500"/> Répartition
                </p>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                          dataKey="value" paddingAngle={2}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0}/>)}
                        </Pie>
                        <Tooltip formatter={(v:number) => [`$${v.toFixed(2)}`,'']} contentStyle={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px'}} itemStyle={{color:'#111827'}} labelStyle={{color:'#6b7280'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.slice(0,5).map((e,i) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:e.color}}/>
                          <p className="text-gray-500 text-xs flex-1">{e.name}</p>
                          <p className="text-gray-900 text-xs font-semibold tabular-nums">{((e.value/totalLive)*100).toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                    <PieChartIcon size={32} className="mb-2 opacity-30"/>
                    <p className="text-sm text-gray-400">Aucune position</p>
                  </div>
                )}
              </Card>
            </div>

            {/* ── Holdings table ────────────────────── */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="font-bold text-gray-900">Positions ouvertes</p>
                <Button variant="outline" size="sm" leftIcon={<Plus size={13}/>} onClick={() => setShowHolding(true)}>
                  Ajouter
                </Button>
              </div>
              {selected.holdings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <BarChart3 size={36} className="mb-3 opacity-30"/>
                  <p className="font-medium text-gray-400 mb-1">Aucune position</p>
                  <Button variant="brand" size="sm" leftIcon={<Plus size={13}/>} onClick={() => setShowHolding(true)} className="mt-3">
                    Ajouter une position
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Titre','Quantité','Prix moy.','Prix actuel','Valeur','P&L','P&L %',''].map(h => (
                          <th key={h} className="px-4 py-3 text-right first:text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.holdings.map((h, i) => {
                        const live    = liveQuotes[h.symbol] ?? h.currentPrice
                        const value   = live * h.quantity
                        const cost    = h.avgBuyPrice * h.quantity
                        const pnl     = value - cost
                        const pnlPct  = cost > 0 ? (pnl / cost) * 100 : 0
                        const isUp    = pnl >= 0
                        return (
                          <motion.tr key={h.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                            transition={{ delay: i*.04 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700">
                                  {h.symbol[0]}
                                </div>
                                <div>
                                  <Link href={`/stock/${h.symbol}`} className="font-bold text-gray-900 hover:text-blue-500 transition-colors flex items-center gap-1">
                                    {h.symbol} <ArrowUpRight size={11}/>
                                  </Link>
                                  <p className="text-gray-500 text-xs truncate max-w-[120px]">{h.companyName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{h.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-400 tabular-nums">${h.avgBuyPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                              ${live.toFixed(2)}
                              {connected && (
                                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums">${value.toFixed(2)}</td>
                            <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', isUp ? 'text-green-600' : 'text-red-500')}>
                              <span className="flex items-center justify-end gap-1">
                                {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                {isUp?'+':''}{pnl.toFixed(2)}$
                              </span>
                            </td>
                            <td className={cn('px-4 py-3 text-right font-bold tabular-nums', isUp ? 'text-green-600' : 'text-red-500')}>
                              {formatPct(pnlPct)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => removeHolding(selected.id, h.id, h.symbol)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 size={13}/>
                              </button>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-gray-500 text-xs">{selected.holdings.length} position{selected.holdings.length>1?'s':''}</p>
                    <p className="text-xs text-gray-500">
                      Total: <span className="text-gray-900 font-bold">${totalLive.toFixed(2)}</span>
                      &nbsp;·&nbsp;
                      <span className={selected.totalPnl>=0?'text-green-600':'text-red-500'}>
                        {selected.totalPnl>=0?'+':''}${selected.totalPnl.toFixed(2)} ({formatPct(selected.totalPnlPct)})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      ) : (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex flex-col items-center justify-center py-24 text-center">
          <Wallet size={48} className="text-gray-300 mb-4"/>
          <p className="text-xl font-bold text-gray-900 mb-2">Aucun portefeuille</p>
          <p className="text-gray-500 mb-6">Créez votre premier portefeuille pour commencer.</p>
          <Button variant="brand" leftIcon={<Plus size={15}/>} onClick={() => setShowNew(true)}>
            Créer un portefeuille
          </Button>
        </motion.div>
      )}

      {/* ── Modals ─────────────────────────────────────── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau portefeuille">
        <div className="space-y-4">
          <Input label="Nom du portefeuille" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="ex: Portefeuille principal" leftIcon={<Wallet size={14}/>}
            onKeyDown={e => e.key==='Enter' && createPortfolio()}/>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button variant="brand" onClick={createPortfolio} disabled={!newName.trim()}>Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showHolding} onClose={() => setShowHolding(false)} title="Ajouter une position" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Symbole" value={newH.symbol} onChange={e => setNewH(p=>({...p,symbol:e.target.value.toUpperCase()}))} placeholder="AAPL"/>
          <Input label="Société" value={newH.companyName} onChange={e => setNewH(p=>({...p,companyName:e.target.value}))} placeholder="Apple Inc."/>
          <Input label="Quantité" type="number" value={newH.quantity} onChange={e => setNewH(p=>({...p,quantity:e.target.value}))} placeholder="10"/>
          <Input label="Prix d'achat moyen ($)" type="number" value={newH.avgBuyPrice} onChange={e => setNewH(p=>({...p,avgBuyPrice:e.target.value}))} placeholder="150.00"/>
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="ghost" onClick={() => setShowHolding(false)}>Annuler</Button>
          <Button variant="brand" onClick={addHolding} leftIcon={<Plus size={14}/>}>Ajouter</Button>
        </div>
      </Modal>
    </div>
  )
}
