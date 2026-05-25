'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Trash2, Wallet,
  BarChart3, PieChartIcon, ArrowUpRight, RefreshCw, Radio,
} from 'lucide-react'
import api from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn, formatPct } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface Holding {
  id:string; symbol:string; companyName:string
  quantity:number; avgBuyPrice:number
  currentPrice:number; value:number; pnl:number; pnlPct:number
}
interface Portfolio {
  id:string; name:string; holdings:Holding[]
  totalValue:number; totalCost:number; totalPnl:number; totalPnlPct:number
}
interface HistPoint { date:string; close:number }

const PERIODS = ['1d','5d','1mo','3mo','6mo','1y','5y'] as const
type Period = typeof PERIODS[number]
const PIE_COLORS = ['#3B8EF3','#0ECB81','#F0B90B','#F6465D','#9B59B6','#00B8D9','#F97316','#84CC16']

const PfTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded px-2 py-1.5 text-[10px] font-mono shadow-xl">
      <p className="text-[var(--fin-t3)]">{label}</p>
      <p className="text-[var(--fin-t1)] font-bold">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function PortfolioPage() {
  const [portfolios, setPortfolios]   = useState<Portfolio[]>([])
  const [selected, setSelected]       = useState<Portfolio|null>(null)
  const [history,  setHistory]        = useState<HistPoint[]>([])
  const [period,   setPeriod]         = useState<Period>('1mo')
  const [liveQuotes, setLiveQuotes]   = useState<Record<string,number>>({})
  const [showNew,    setShowNew]      = useState(false)
  const [showHolding,setShowHolding]  = useState(false)
  const [newName,  setNewName]        = useState('')
  const [newH, setNewH]               = useState({ symbol:'', quantity:'', avgBuyPrice:'', companyName:'' })
  const [loading,  setLoading]        = useState(true)
  const [histLoading,setHistLoading]  = useState(false)
  const [error,    setError]          = useState<string|null>(null)
  const selectedIdRef                 = useRef<string|null>(null)

  const { connected, subscribe } = useWebSocket(msg => {
    if (msg.type === 'quotes') {
      const m: Record<string,number> = {}
      msg.data.forEach((q: any) => { m[q.symbol] = q.price })
      setLiveQuotes(p => ({ ...p, ...m }))
    }
  })

  const loadHistory = useCallback(async (symbol: string, p: Period) => {
    if (!symbol) return; setHistLoading(true)
    try { const r = await api.get(`/market/${symbol}/historical?period=${p}`); setHistory(r.data ?? []) }
    catch { setHistory([]) } finally { setHistLoading(false) }
  }, [])

  const loadPortfolio = useCallback(async (id: string) => {
    selectedIdRef.current = id
    try {
      const r = await api.get(`/portfolios/${id}`)
      const p: Portfolio = r.data; setSelected(p)
      if (p.holdings.length > 0) { subscribe(p.holdings.map(h => h.symbol)); loadHistory(p.holdings[0].symbol, period) }
      else setHistory([])
    } catch (e: any) {
      if (e?.response?.status === 401) window.location.href = '/login'
      else toast.error('Erreur chargement portefeuille')
    }
  }, [period, loadHistory, subscribe])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/portfolios'); const list: Portfolio[] = r.data ?? []
      setPortfolios(list); if (list.length > 0) await loadPortfolio(list[0].id)
    } catch (e: any) {
      if (e?.response?.status === 401) { window.location.href = '/login'; return }
      setError('Impossible de charger vos portefeuilles.')
    } finally { setLoading(false) }
  }, [loadPortfolio])

  useEffect(() => { load() }, [load])
  useEffect(() => { const sym = selected?.holdings[0]?.symbol; if (sym) loadHistory(sym, period) }, [period, selected?.id, loadHistory])

  const createPortfolio = async () => {
    if (!newName.trim()) return
    await api.post('/portfolios', { name: newName })
    toast.success('Portefeuille créé'); setNewName(''); setShowNew(false); await load()
  }

  const addHolding = async () => {
    if (!selected || !newH.symbol || !newH.quantity || !newH.avgBuyPrice) return
    await api.post(`/portfolios/${selected.id}/holdings`, {
      symbol: newH.symbol.toUpperCase(), quantity: Number(newH.quantity),
      avgBuyPrice: Number(newH.avgBuyPrice), companyName: newH.companyName,
    })
    toast.success(`${newH.symbol.toUpperCase()} ajouté`)
    setNewH({ symbol:'', quantity:'', avgBuyPrice:'', companyName:'' }); setShowHolding(false)
    await loadPortfolio(selected.id)
  }

  const removeHolding = async (pid: string, hid: string, sym: string) => {
    await api.delete(`/portfolios/${pid}/holdings/${hid}`)
    toast.success(`${sym} supprimé`); await loadPortfolio(pid)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-[var(--fin-t3)]">
      <RefreshCw size={16} strokeWidth={1.5} className="animate-spin"/>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-[var(--fin-t2)] text-sm">{error}</p>
      <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[var(--fin-blue)] text-white">
        <RefreshCw size={11}/> Réessayer
      </button>
    </div>
  )

  const totalLive = selected?.holdings.reduce((s,h) => s + (liveQuotes[h.symbol] ?? h.currentPrice) * h.quantity, 0) ?? 0
  const pieData   = selected?.holdings.map((h,i) => ({ name:h.symbol, value:(liveQuotes[h.symbol] ?? h.currentPrice) * h.quantity, color:PIE_COLORS[i%PIE_COLORS.length] })) ?? []
  const chartUp   = history.length >= 2 && history[history.length-1]?.close >= history[0]?.close

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className={cn('flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)]','bg-[var(--fin-panel)]')}>
        <Wallet size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Portfolio</span>
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <Radio size={10} strokeWidth={1.5} className={connected?'text-[var(--fin-green)]':'text-[var(--fin-t3)]'}/>
        <span className={cn('text-[10px] font-mono', connected?'text-[var(--fin-green)]':'text-[var(--fin-t3)]')}>
          {connected?'TEMPS RÉEL':'HORS LIGNE'}
        </span>
        <div className="flex-1"/>
        {selected && (
          <span className="text-[10px] font-mono text-[var(--fin-t2)]">
            <span className="text-[var(--fin-t3)]">TOTAL </span>
            <span className="text-[var(--fin-t1)] font-bold">${totalLive.toLocaleString('fr-FR',{minimumFractionDigits:2})}</span>
            {' '}
            <span className={cn('font-bold', selected.totalPnl>=0?'text-[var(--fin-green)]':'text-[var(--fin-red)]')}>
              {selected.totalPnl>=0?'+':''}{formatPct(selected.totalPnlPct)}
            </span>
          </span>
        )}
        <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
        <button onClick={load} className="flex items-center justify-center w-7 h-7 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors">
          <RefreshCw size={11} strokeWidth={1.5}/>
        </button>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium bg-[var(--fin-blue)] text-white hover:opacity-90 transition-opacity">
          <Plus size={11}/> Nouveau
        </button>
      </div>

      {/* Portfolio tabs */}
      {portfolios.length > 0 && (
        <div className={cn('flex items-stretch border-b border-[var(--fin-border)] overflow-x-auto','bg-[var(--fin-panel)]')}>
          {portfolios.map(p => (
            <button key={p.id} onClick={() => loadPortfolio(p.id)}
              className={cn(
                'px-4 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                selected?.id === p.id
                  ? 'border-[var(--fin-blue)] text-[var(--fin-blue)]'
                  : 'border-transparent text-[var(--fin-t3)] hover:text-[var(--fin-t2)]'
              )}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {selected ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label:'VALEUR LIVE',   value:`$${totalLive.toFixed(2)}`,               color:'text-[var(--fin-t1)]' },
                { label:'INVESTI',       value:`$${selected.totalCost.toFixed(2)}`,       color:'text-[var(--fin-t2)]' },
                { label:'P&L NET',       value:`${selected.totalPnl>=0?'+':''}$${Math.abs(selected.totalPnl).toFixed(2)}`, color:selected.totalPnl>=0?'text-[var(--fin-green)]':'text-[var(--fin-red)]' },
                { label:'PERF.',         value:formatPct(selected.totalPnlPct),           color:selected.totalPnlPct>=0?'text-[var(--fin-green)]':'text-[var(--fin-red)]' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-lg border border-[var(--fin-border)] px-3 py-2','bg-[var(--fin-panel)]')}>
                  <p className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">{s.label}</p>
                  <p className={cn('text-base font-bold font-mono tabular-nums mt-0.5', s.color)}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Chart + Pie */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cn('col-span-2 rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
                <div className={cn('flex items-center gap-3 px-3 py-2 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                  <BarChart3 size={10} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
                  <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">
                    {selected.holdings[0]?.symbol ?? 'Historique'}
                    {histLoading && <RefreshCw size={9} className="inline ml-1.5 animate-spin"/>}
                  </span>
                  <div className="flex-1"/>
                  <div className="flex gap-0.5">
                    {PERIODS.map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors',
                          period===p ? 'bg-[var(--fin-blue)] text-white' : 'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] hover:bg-[var(--fin-hover)]')}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3">
                  {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={history} margin={{top:4,right:4,left:0,bottom:0}}>
                        <defs>
                          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={chartUp?'var(--fin-green)':'var(--fin-red)'} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={chartUp?'var(--fin-green)':'var(--fin-red)'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="var(--fin-border)" vertical={false}/>
                        <XAxis dataKey="date" tick={{fontSize:9,fill:'var(--fin-t3)',fontFamily:'monospace'}} tickLine={false} axisLine={false} tickFormatter={v=>v.slice(5)} interval="preserveStartEnd"/>
                        <YAxis tick={{fontSize:9,fill:'var(--fin-t3)',fontFamily:'monospace'}} tickLine={false} axisLine={false} domain={['auto','auto']} tickFormatter={v=>`$${v}`} width={48}/>
                        <Tooltip content={<PfTooltip/>}/>
                        <Area type="monotone" dataKey="close" stroke={chartUp?'var(--fin-green)':'var(--fin-red)'} strokeWidth={1.5} fill="url(#pg)" dot={false} activeDot={{r:3,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-[10px] text-[var(--fin-t3)] font-mono">
                      {histLoading ? 'CHARGEMENT...' : '— DONNÉES INDISPONIBLES'}
                    </div>
                  )}
                </div>
              </div>

              {/* Répartition */}
              <div className={cn('rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
                <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                  <PieChartIcon size={10} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
                  <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Répartition</span>
                </div>
                <div className="p-3">
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={58} dataKey="value" paddingAngle={2}>
                            {pieData.map((e,i) => <Cell key={i} fill={e.color} strokeWidth={0}/>)}
                          </Pie>
                          <Tooltip formatter={(v:number) => [`$${v.toFixed(2)}`,'Value']}
                            contentStyle={{background:'var(--fin-panel)',border:'1px solid var(--fin-border)',borderRadius:'4px',fontSize:'10px',fontFamily:'monospace'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1 mt-1">
                        {pieData.slice(0,6).map((e,i) => {
                          const pct = totalLive > 0 ? ((e.value/totalLive)*100).toFixed(1) : '0'
                          return (
                            <div key={e.name} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:e.color}}/>
                              <span className="text-[10px] text-[var(--fin-t2)] font-mono flex-1">{e.name}</span>
                              <span className="text-[10px] text-[var(--fin-t1)] font-mono font-bold tabular-nums">{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-[var(--fin-t3)]">
                      <PieChartIcon size={24} strokeWidth={1} className="mb-2"/>
                      <p className="text-[10px] font-mono">AUCUNE POSITION</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Holdings table */}
            <div className={cn('rounded-lg border border-[var(--fin-border)] overflow-hidden','bg-[var(--fin-panel)]')}>
              <div className={cn('flex items-center gap-3 px-3 py-2 border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Positions ouvertes</span>
                <span className="text-[9px] font-mono text-[var(--fin-t3)]">({selected.holdings.length})</span>
                <div className="flex-1"/>
                <button onClick={() => setShowHolding(true)}
                  className="flex items-center gap-1.5 h-6 px-2 rounded text-[10px] bg-[var(--fin-blue)] text-white hover:opacity-90 transition-opacity">
                  <Plus size={9}/> Ajouter
                </button>
              </div>
              {selected.holdings.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <BarChart3 size={20} strokeWidth={1} className="text-[var(--fin-t3)] mb-2"/>
                  <p className="text-xs text-[var(--fin-t2)]">Aucune position</p>
                  <p className="text-[10px] text-[var(--fin-t3)] mt-1">Ajoutez votre première position pour commencer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={cn('border-b border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                        {[['Titre','left'],['Qté','right'],['PRU','right'],['Prix live','right'],['Valeur','right'],['P&L $','right'],['P&L %','right'],['','right']].map(([h,a]) => (
                          <th key={h} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)]', a==='right'?'text-right':'text-left')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.holdings.map((h,i) => {
                        const live  = liveQuotes[h.symbol] ?? h.currentPrice
                        const value = live * h.quantity
                        const pnl   = value - h.avgBuyPrice * h.quantity
                        const pnlPct= h.avgBuyPrice * h.quantity > 0 ? (pnl/(h.avgBuyPrice*h.quantity))*100 : 0
                        const up    = pnl >= 0
                        return (
                          <tr key={h.id} className={cn('border-b border-[var(--fin-border)] last:border-0 transition-colors group','hover:bg-[var(--fin-hover)]')}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-[var(--fin-t1)]">{h.symbol}</span>
                                {connected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--fin-green)] animate-pulse"/>}
                                <span className="text-[9px] text-[var(--fin-t3)] truncate max-w-[80px]">{h.companyName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-[var(--fin-t2)] tabular-nums">{h.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-[var(--fin-t3)] tabular-nums">${h.avgBuyPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-[var(--fin-t1)] font-bold tabular-nums">${live.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-[var(--fin-t2)] tabular-nums">${value.toFixed(2)}</td>
                            <td className={cn('px-3 py-2 text-right font-mono text-xs font-bold tabular-nums',up?'text-[var(--fin-green)]':'text-[var(--fin-red)]')}>
                              {up?'+':''}{pnl.toFixed(2)}
                            </td>
                            <td className={cn('px-3 py-2 text-right font-mono text-xs font-bold tabular-nums',up?'text-[var(--fin-green)]':'text-[var(--fin-red)]')}>
                              {formatPct(pnlPct)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeHolding(selected.id, h.id, h.symbol)}
                                className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--fin-t3)] hover:text-[var(--fin-red)] hover:bg-[var(--fin-red-bg)] transition-all">
                                <Trash2 size={11} strokeWidth={1.5}/>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className={cn('flex items-center justify-between px-3 py-1.5 border-t border-[var(--fin-border)]','bg-[var(--fin-surface)]')}>
                    <span className="text-[9px] font-mono text-[var(--fin-t3)]">{selected.holdings.length} position{selected.holdings.length>1?'s':''}</span>
                    <span className="text-[10px] font-mono text-[var(--fin-t3)]">
                      Total <span className="text-[var(--fin-t1)] font-bold">${totalLive.toFixed(2)}</span>
                      {' · '}
                      <span className={selected.totalPnl>=0?'text-[var(--fin-green)]':'text-[var(--fin-red)]'}>
                        {selected.totalPnl>=0?'+':''}{formatPct(selected.totalPnlPct)}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-24 text-center">
            <Wallet size={24} strokeWidth={1} className="text-[var(--fin-t3)] mb-3"/>
            <p className="text-sm font-medium text-[var(--fin-t2)] mb-1">Aucun portefeuille</p>
            <p className="text-[10px] text-[var(--fin-t3)] mb-4">Créez votre premier portefeuille pour suivre vos investissements.</p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-8 px-4 rounded text-xs bg-[var(--fin-blue)] text-white hover:opacity-90">
              <Plus size={12}/> Créer un portefeuille
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau portefeuille" description="Donnez un nom à votre portefeuille">
        <div className="space-y-4">
          <Input label="Nom" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="ex: Portefeuille principal" onKeyDown={e => e.key==='Enter'&&createPortfolio()}/>
          <div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button variant="brand" onClick={createPortfolio} disabled={!newName.trim()}>Créer</Button></div>
        </div>
      </Modal>
      <Modal open={showHolding} onClose={() => setShowHolding(false)} title="Ajouter une position" size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Symbole" value={newH.symbol} onChange={e=>setNewH(p=>({...p,symbol:e.target.value.toUpperCase()}))} placeholder="AAPL"/>
          <Input label="Société" value={newH.companyName} onChange={e=>setNewH(p=>({...p,companyName:e.target.value}))} placeholder="Apple Inc."/>
          <Input label="Quantité" type="number" value={newH.quantity} onChange={e=>setNewH(p=>({...p,quantity:e.target.value}))} placeholder="10"/>
          <Input label="Prix d'achat moyen ($)" type="number" value={newH.avgBuyPrice} onChange={e=>setNewH(p=>({...p,avgBuyPrice:e.target.value}))} placeholder="150.00"/>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => setShowHolding(false)}>Annuler</Button>
          <Button variant="brand" onClick={addHolding} disabled={!newH.symbol||!newH.quantity||!newH.avgBuyPrice}>Ajouter</Button>
        </div>
      </Modal>
    </div>
  )
}
