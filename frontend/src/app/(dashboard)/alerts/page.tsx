'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Plus, Trash2, RefreshCw, Target, TrendingDown, Activity,
  AlertTriangle, Check, Pause, Play, X, ChevronDown, Filter,
  Radio, Edit2, Zap,
} from 'lucide-react'
import api from '@/lib/api'
import { useAlerts } from '@/hooks/useAlerts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Alert {
  id:string; symbol:string; type:'PRICE'|'PERCENT_CHANGE'|'VOLUME'
  condition:'ABOVE'|'BELOW'; threshold:number; message:string
  active:boolean; triggered:boolean; triggeredAt:string|null; createdAt:string
}

type FilterType = 'ALL' | 'ACTIVE' | 'TRIGGERED' | 'INACTIVE'

// ── Helpers ──────────────────────────────────────────────────
const TYPE_META = {
  PRICE:          { label:'PRIX',     short:'$',   color:'text-[var(--fin-blue)]',  bg:'bg-[var(--fin-blue-bg)]'  },
  PERCENT_CHANGE: { label:'VAR%',     short:'%',   color:'text-[var(--fin-cyan)]',  bg:'bg-[var(--fin-blue-bg)]'  },
  VOLUME:         { label:'VOL',      short:'V',   color:'text-[var(--fin-amber)]', bg:'bg-[var(--fin-amber-bg)]' },
}
const COND_SYM = { ABOVE:'≥', BELOW:'≤' }

function fmt(n: number, type: string) {
  if (type === 'PERCENT_CHANGE') return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
  if (type === 'VOLUME') return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n)
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
}

// ── Status pill ───────────────────────────────────────────────
function StatusPill({ active, triggered }: { active: boolean; triggered: boolean }) {
  if (triggered) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)] border-opacity-30">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fin-amber)] animate-pulse"/>DÉCLENCHÉ
    </span>
  )
  if (active) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)] border-opacity-30">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fin-green)]"/>ACTIF
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--fin-surface)] text-[var(--fin-t3)] border border-[var(--fin-border)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fin-t3)]"/>INACTIF
    </span>
  )
}

// ── Notification flottante ────────────────────────────────────
function AlertNotif({ n, onDismiss }: { n: any; onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity:0, x:60, scale:.96 }} animate={{ opacity:1, x:0, scale:1 }}
      exit={{ opacity:0, x:60 }} layout
      className={cn(
        'w-72 rounded-lg border shadow-2xl overflow-hidden',
        'bg-[var(--fin-panel)] border-[var(--fin-amber)] border-opacity-60',
      )}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--fin-amber-bg)] border-b border-[var(--fin-amber)] border-opacity-30">
        <Zap size={11} className="text-[var(--fin-amber)]"/>
        <span className="text-[10px] font-bold text-[var(--fin-amber)] uppercase tracking-wider">Alerte déclenchée</span>
        <button onClick={onDismiss} className="ml-auto text-[var(--fin-t3)] hover:text-[var(--fin-t1)]"><X size={10}/></button>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-bold text-[var(--fin-t1)] font-mono">{n.symbol}</p>
        <p className="text-[10px] text-[var(--fin-t2)] mt-0.5">{n.message}</p>
        <div className="flex gap-3 mt-1.5 text-[10px] font-mono">
          <span className="text-[var(--fin-t3)]">Valeur <span className="text-[var(--fin-t1)] font-bold">{n.currentValue?.toFixed(2)}</span></span>
          <span className="text-[var(--fin-t3)]">Seuil <span className="text-[var(--fin-amber)] font-bold">{n.threshold}</span></span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Create panel inline ───────────────────────────────────────
function CreatePanel({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ symbol:'', type:'PRICE', condition:'ABOVE', threshold:'', message:'' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async () => {
    if (!form.symbol || !form.threshold) return
    try {
      await api.post('/alerts', { ...form, threshold: Number(form.threshold) })
      toast.success(`Alerte ${form.symbol} créée`)
      onCreated()
    } catch {
      toast.error('Impossible de créer l\'alerte — backend inaccessible')
    }
  }

  const sel = (cls: string) => cn(
    'h-7 px-2 text-xs rounded border font-mono transition-colors',
    'bg-[var(--fin-surface)] border-[var(--fin-border)] text-[var(--fin-t1)]',
    'focus:outline-none focus:border-[var(--fin-blue)] focus:ring-0',
    cls
  )

  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
      className="overflow-hidden">
      <div className={cn(
        'border-b border-[var(--fin-border)] px-4 py-3',
        'bg-[var(--fin-surface)]',
      )}>
        {/* Titre panneau */}
        <div className="flex items-center gap-2 mb-3">
          <Zap size={11} className="text-[var(--fin-blue)]"/>
          <span className="text-[10px] font-bold text-[var(--fin-t3)] uppercase tracking-wider">Nouvelle alerte</span>
          <div className="flex-1 h-px bg-[var(--fin-border)] ml-1"/>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Symbole */}
          <input ref={inputRef}
            value={form.symbol} onChange={e => setForm(p => ({...p, symbol:e.target.value.toUpperCase()}))}
            placeholder="SYMBOLE" maxLength={10}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className={cn(sel('w-28 font-bold tracking-wider'))}/>

          {/* Type */}
          <select value={form.type} onChange={e => setForm(p => ({...p, type:e.target.value}))}
            className={sel('w-28')}>
            <option value="PRICE">Prix ($)</option>
            <option value="PERCENT_CHANGE">Variation (%)</option>
            <option value="VOLUME">Volume</option>
          </select>

          {/* Condition */}
          <select value={form.condition} onChange={e => setForm(p => ({...p, condition:e.target.value}))}
            className={sel('w-32')}>
            <option value="ABOVE">≥  Au-dessus</option>
            <option value="BELOW">≤  En-dessous</option>
          </select>

          {/* Seuil */}
          <input type="number" value={form.threshold}
            onChange={e => setForm(p => ({...p, threshold:e.target.value}))}
            placeholder="0.00"
            onKeyDown={e => e.key === 'Enter' && submit()}
            className={cn(sel('w-28 text-right'))}/>

          {/* Message optionnel */}
          <input value={form.message} onChange={e => setForm(p => ({...p, message:e.target.value}))}
            placeholder="Note (optionnel)"
            className={cn(sel('flex-1 min-w-40'))}/>

          {/* Preview */}
          {form.symbol && form.threshold && (
            <span className="text-[10px] font-mono text-[var(--fin-t3)] whitespace-nowrap">
              → <span className="text-[var(--fin-green)] font-bold">{form.symbol}</span>{' '}
              {COND_SYM[form.condition as 'ABOVE'|'BELOW']} <span className="text-[var(--fin-t1)]">{form.threshold}</span>
            </span>
          )}

          {/* Actions */}
          <div className="flex gap-1.5 ml-auto">
            <button onClick={onCancel}
              className="h-7 px-3 text-xs rounded border border-[var(--fin-border)] text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors">
              Annuler
            </button>
            <button onClick={submit}
              disabled={!form.symbol || !form.threshold}
              className={cn(
                'h-7 px-3 text-xs rounded font-medium transition-colors',
                'bg-[var(--fin-blue)] text-white hover:opacity-90',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}>
              Créer l'alerte
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function AlertsPage() {
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter]       = useState<FilterType>('ALL')
  const [sortCol, setSortCol]     = useState<string>('createdAt')
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('desc')
  const { notifications, connected, dismiss } = useAlerts()

  const load = async () => {
    try {
      const r = await api.get('/alerts')
      setAlerts(r.data)
    } catch { toast.error('Erreur chargement alertes') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const deleteAlert = async (id: string, sym: string) => {
    await api.delete(`/alerts/${id}`)
    toast.success(`${sym} supprimée`)
    load()
  }
  const toggleAlert = async (id: string) => {
    await api.patch(`/alerts/${id}/toggle`)
    load()
  }

  const active    = alerts.filter(a => a.active && !a.triggered)
  const triggered = alerts.filter(a => a.triggered)
  const inactive  = alerts.filter(a => !a.active && !a.triggered)

  const filtered = alerts
    .filter(a => {
      if (filter === 'ACTIVE')    return a.active && !a.triggered
      if (filter === 'TRIGGERED') return a.triggered
      if (filter === 'INACTIVE')  return !a.active && !a.triggered
      return true
    })
    .sort((a, b) => {
      let av: any = (a as any)[sortCol] ?? ''
      let bv: any = (b as any)[sortCol] ?? ''
      if (sortDir === 'asc') return av > bv ? 1 : -1
      return av < bv ? 1 : -1
    })

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const TH = ({ col, label, className }: { col: string; label: string; className?: string }) => (
    <th onClick={() => handleSort(col)}
      className={cn(
        'px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap',
        'text-[var(--fin-t3)] hover:text-[var(--fin-t2)] transition-colors',
        sortCol === col && 'text-[var(--fin-blue)]',
        className
      )}>
      {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="flex flex-col h-full min-h-screen">

      {/* ── Notifications flottantes ── */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.slice(0,3).map(n => (
            <div key={n.alertId} className="pointer-events-auto">
              <AlertNotif n={n} onDismiss={() => dismiss(n.alertId)}/>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════════════
          STATUS BAR — compact, Bloomberg-style
          ════════════════════════════════════════════════════ */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-10 flex-shrink-0',
        'border-b border-[var(--fin-border)] bg-[var(--fin-panel)]',
      )}>

        {/* Titre */}
        <div className="flex items-center gap-2">
          <Bell size={12} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
          <span className="text-[10px] font-bold text-[var(--fin-t2)] uppercase tracking-widest">Alertes</span>
        </div>

        <div className="w-px h-4 bg-[var(--fin-border)]"/>

        {/* WS status */}
        <div className="flex items-center gap-1.5">
          <Radio size={10} strokeWidth={1.5} className={connected ? 'text-[var(--fin-green)]' : 'text-[var(--fin-t3)]'}/>
          <span className={cn('text-[10px] font-mono', connected ? 'text-[var(--fin-green)]' : 'text-[var(--fin-t3)]')}>
            {connected ? 'WS ACTIF' : 'HORS LIGNE'}
          </span>
        </div>

        <div className="w-px h-4 bg-[var(--fin-border)]"/>

        {/* Compteurs */}
        {([
          { key:'ALL'      as FilterType, label:`TOUTES`,      count:alerts.length,    color:'text-[var(--fin-t2)]'    },
          { key:'ACTIVE'   as FilterType, label:`ACTIVES`,     count:active.length,    color:'text-[var(--fin-green)]' },
          { key:'TRIGGERED'as FilterType, label:`DÉCLENCHÉES`, count:triggered.length, color:'text-[var(--fin-amber)]' },
          { key:'INACTIVE' as FilterType, label:`INACTIVES`,   count:inactive.length,  color:'text-[var(--fin-t3)]'    },
        ]).map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
              filter === key
                ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]'
                : `${color} hover:bg-[var(--fin-hover)]`
            )}>
            <span className="font-bold">{count}</span>
            <span className="text-[var(--fin-t3)]">{label}</span>
          </button>
        ))}

        <div className="flex-1"/>

        {/* Actions */}
        <button onClick={load}
          className="flex items-center justify-center w-7 h-7 rounded text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)] transition-colors">
          <RefreshCw size={11} strokeWidth={1.5}/>
        </button>

        <button onClick={() => setShowCreate(v => !v)}
          className={cn(
            'flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors',
            showCreate
              ? 'bg-[var(--fin-surface)] border border-[var(--fin-border)] text-[var(--fin-t2)]'
              : 'bg-[var(--fin-blue)] text-white hover:opacity-90'
          )}>
          {showCreate ? <X size={11}/> : <Plus size={11}/>}
          {showCreate ? 'Fermer' : 'Créer'}
        </button>
      </div>

      {/* ── Panneau de création ── */}
      <AnimatePresence>
        {showCreate && (
          <CreatePanel
            onCreated={() => { setShowCreate(false); load() }}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Bannière "Déclenché" ── */}
      <AnimatePresence>
        {triggered.length > 0 && filter !== 'INACTIVE' && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className={cn(
              'flex items-center gap-3 px-4 py-1.5 border-b',
              'bg-[var(--fin-amber-bg)] border-[var(--fin-amber)] border-opacity-30',
            )}>
            <AlertTriangle size={11} className="text-[var(--fin-amber)] flex-shrink-0"/>
            <span className="text-[10px] font-bold text-[var(--fin-amber)] uppercase tracking-wider">
              {triggered.length} alerte{triggered.length > 1 ? 's' : ''} déclenchée{triggered.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2 flex-wrap">
              {triggered.map(a => (
                <span key={a.id} className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--fin-t2)]">
                  <span className="text-[var(--fin-amber)] font-bold">{a.symbol}</span>
                  <span className="text-[var(--fin-t3)]">{COND_SYM[a.condition]} {a.threshold}</span>
                  <span className="text-[var(--fin-t3)]">·</span>
                  <span className="text-[var(--fin-t3)]">{fmtDate(a.triggeredAt)}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════
          TABLE — dense, Bloomberg-style
          ════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
            <RefreshCw size={16} strokeWidth={1.5} className="animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-lg bg-[var(--fin-surface)] border border-[var(--fin-border)] flex items-center justify-center mb-3">
              <Bell size={18} strokeWidth={1} className="text-[var(--fin-t3)]"/>
            </div>
            <p className="text-sm font-medium text-[var(--fin-t2)] mb-1">
              {filter === 'ALL' ? 'Aucune alerte configurée' : `Aucune alerte ${filter.toLowerCase()}`}
            </p>
            <p className="text-xs text-[var(--fin-t3)] mb-4 max-w-xs">
              Configurez des alertes sur le prix, la variation ou le volume de n'importe quel actif.
            </p>
            {filter === 'ALL' && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 h-7 px-3 rounded text-xs bg-[var(--fin-blue)] text-white hover:opacity-90 transition-opacity">
                <Plus size={11}/> Créer une alerte
              </button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead className={cn('sticky top-0 z-10', 'bg-[var(--fin-surface)] border-b border-[var(--fin-border)]')}>
              <tr>
                <TH col="symbol"    label="Symbole"    className="pl-4 w-24"/>
                <TH col="type"      label="Indicateur" className="w-24"/>
                <TH col="condition" label="Cond."      className="w-12 text-center"/>
                <TH col="threshold" label="Seuil cible" className="w-28 text-right"/>
                <TH col="active"    label="État"       className="w-32"/>
                <TH col="createdAt" label="Créé le"    className="w-32 hidden sm:table-cell"/>
                <th className="px-3 py-1.5 w-24 text-right text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fin-t3)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((a, i) => {
                  const meta = TYPE_META[a.type]
                  return (
                    <motion.tr key={a.id}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        'group border-b border-[var(--fin-border)] transition-colors',
                        'hover:bg-[var(--fin-hover)]',
                        a.triggered && 'bg-[var(--fin-amber-bg)]',
                        !a.active && !a.triggered && 'opacity-50',
                      )}>

                      {/* Symbole */}
                      <td className="px-4 py-2">
                        <span className="font-mono font-bold text-[var(--fin-t1)] text-xs tracking-wider">
                          {a.symbol}
                        </span>
                      </td>

                      {/* Indicateur */}
                      <td className="px-3 py-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono',
                          meta.bg, meta.color
                        )}>
                          {meta.label}
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          'font-mono text-sm font-bold',
                          a.condition === 'ABOVE' ? 'text-[var(--fin-green)]' : 'text-[var(--fin-red)]'
                        )}>
                          {COND_SYM[a.condition]}
                        </span>
                      </td>

                      {/* Seuil */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono text-xs font-bold text-[var(--fin-t1)]">
                          {fmt(a.threshold, a.type)}
                        </span>
                      </td>

                      {/* État */}
                      <td className="px-3 py-2">
                        <StatusPill active={a.active} triggered={a.triggered}/>
                      </td>

                      {/* Créé le */}
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <span className="font-mono text-[10px] text-[var(--fin-t3)]">
                          {fmtDate(a.triggeredAt || a.createdAt)}
                        </span>
                        {a.triggeredAt && (
                          <p className="font-mono text-[9px] text-[var(--fin-amber)] mt-0.5">⚡ déclenché</p>
                        )}
                        {a.message && (
                          <p className="text-[9px] text-[var(--fin-t3)] mt-0.5 truncate max-w-[120px]">{a.message}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">

                          {/* Toggle actif */}
                          <button onClick={() => toggleAlert(a.id)}
                            title={a.active ? 'Suspendre' : 'Activer'}
                            className={cn(
                              'flex items-center justify-center w-6 h-6 rounded transition-colors',
                              a.active
                                ? 'text-[var(--fin-amber)] hover:bg-[var(--fin-amber-bg)]'
                                : 'text-[var(--fin-green)] hover:bg-[var(--fin-green-bg)]'
                            )}>
                            {a.active ? <Pause size={11} strokeWidth={1.5}/> : <Play size={11} strokeWidth={1.5}/>}
                          </button>

                          {/* Réactiver si déclenché */}
                          {a.triggered && (
                            <button onClick={() => toggleAlert(a.id)}
                              title="Réactiver"
                              className="flex items-center justify-center w-6 h-6 rounded text-[var(--fin-blue)] hover:bg-[var(--fin-blue-bg)] transition-colors">
                              <RefreshCw size={11} strokeWidth={1.5}/>
                            </button>
                          )}

                          {/* Supprimer */}
                          <button onClick={() => deleteAlert(a.id, a.symbol)}
                            title="Supprimer"
                            className="flex items-center justify-center w-6 h-6 rounded text-[var(--fin-t3)] hover:text-[var(--fin-red)] hover:bg-[var(--fin-red-bg)] transition-colors">
                            <Trash2 size={11} strokeWidth={1.5}/>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer stats ── */}
      {alerts.length > 0 && (
        <div className={cn(
          'flex items-center gap-4 px-4 py-1.5 border-t border-[var(--fin-border)]',
          'bg-[var(--fin-panel)]'
        )}>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            {filtered.length}/{alerts.length} alerte{alerts.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          </span>
          <span className="text-[var(--fin-t3)] text-[9px]">·</span>
          <span className="text-[9px] font-mono text-[var(--fin-green)]">{active.length} actives</span>
          {triggered.length > 0 && (
            <>
              <span className="text-[var(--fin-t3)] text-[9px]">·</span>
              <span className="text-[9px] font-mono text-[var(--fin-amber)]">{triggered.length} déclenchée{triggered.length > 1 ? 's' : ''}</span>
            </>
          )}
          <div className="flex-1"/>
          <span className="text-[9px] font-mono text-[var(--fin-t3)]">
            Moteur d'évaluation : chaque minute
          </span>
        </div>
      )}
    </div>
  )
}
