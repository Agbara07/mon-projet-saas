'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, RefreshCw, Target, TrendingDown, Activity, AlertTriangle, Check } from 'lucide-react'
import api from '@/lib/api'
import { useAlerts } from '@/hooks/useAlerts'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

interface Alert {
  id:string; symbol:string; type:'PRICE'|'PERCENT_CHANGE'|'VOLUME'
  condition:'ABOVE'|'BELOW'; threshold:number; message:string
  active:boolean; triggered:boolean; triggeredAt:string|null; createdAt:string
}

const TYPE_LABEL: Record<string,string> = { PRICE:'Prix', PERCENT_CHANGE:'Variation %', VOLUME:'Volume' }
const COND_LABEL: Record<string,string> = { ABOVE:'au-dessus de', BELOW:'en-dessous de' }
const TYPE_ICON: Record<string,React.ReactNode> = {
  PRICE:          <Target    size={14}/>,
  PERCENT_CHANGE: <TrendingDown size={14}/>,
  VOLUME:         <Activity  size={14}/>,
}

function NotificationToast({ n, onDismiss }: { n:any; onDismiss:()=>void }) {
  return (
    <motion.div initial={{ opacity:0, x:50, scale:.96 }} animate={{ opacity:1, x:0, scale:1 }}
      exit={{ opacity:0, x:50 }} layout
      className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xl w-80 max-w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={15} className="text-amber-500"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{n.symbol} — Alerte déclenchée</p>
          <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
          <p className="text-gray-400 text-xs mt-1">
            Valeur : <span className="text-gray-900 font-semibold">{n.currentValue.toFixed(2)}</span>
            {' · '}Seuil : <span className="text-amber-600 font-semibold">{n.threshold}</span>
          </p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">✕</button>
      </div>
    </motion.div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts]     = useState<Alert[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ symbol:'', type:'PRICE', condition:'ABOVE', threshold:'', message:'' })
  const [loading, setLoading]   = useState(true)
  const { notifications, connected, dismiss } = useAlerts()

  const load = async () => {
    const r = await api.get('/alerts')
    setAlerts(r.data); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const createAlert = async () => {
    if (!form.symbol || !form.threshold) return
    await api.post('/alerts', { ...form, threshold: Number(form.threshold) })
    toast.success(`Alerte ${form.symbol} créée`)
    setForm({ symbol:'', type:'PRICE', condition:'ABOVE', threshold:'', message:'' })
    setShowForm(false); load()
  }

  const deleteAlert = async (id:string, sym:string) => {
    await api.delete(`/alerts/${id}`)
    toast.success(`Alerte ${sym} supprimée`)
    load()
  }

  const toggleAlert = async (id:string) => {
    await api.patch(`/alerts/${id}/toggle`)
    load()
  }

  const active    = alerts.filter(a => a.active && !a.triggered)
  const triggered = alerts.filter(a => a.triggered)
  const inactive  = alerts.filter(a => !a.active && !a.triggered)

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* Floating notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.slice(0,3).map(n => (
            <div key={n.alertId} className="pointer-events-auto">
              <NotificationToast n={n} onDismiss={() => dismiss(n.alertId)}/>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Bell size={22} className="text-amber-500"/> Alertes
          </h1>
          <Badge variant={connected?'green':'white'} className="mt-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', connected?'bg-green-400 animate-pulse':'bg-gray-400')}/>
            {connected ? 'Moteur actif — évaluation chaque minute' : 'Hors ligne'}
          </Badge>
        </div>
        <Button variant="brand" leftIcon={<Plus size={15}/>} onClick={() => setShowForm(true)}>
          Nouvelle alerte
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Alertes actives',  value:active.length,    color:'text-green-700',  bg:'bg-green-50',  border:'border-green-200',  Icon:Bell          },
          { label:'Déclenchées',      value:triggered.length, color:'text-amber-700',  bg:'bg-amber-50',  border:'border-amber-200',  Icon:AlertTriangle },
          { label:'Inactives',        value:inactive.length,  color:'text-gray-500',   bg:'bg-gray-100',  border:'border-gray-200',   Icon:RefreshCw     },
        ].map(({ label, value, color, bg, border, Icon }, i) => (
          <motion.div key={label} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.07 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', bg, border, color)}>
                  <Icon size={18}/>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className={cn('text-2xl font-black', color)}>{value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Triggered banner */}
      <AnimatePresence>
        {triggered.length > 0 && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-700 font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={15}/> {triggered.length} alerte{triggered.length>1?'s':''} déclenchée{triggered.length>1?'s':''}
              </p>
              <div className="space-y-2">
                {triggered.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-xl px-4 py-3">
                    <div>
                      <span className="font-bold text-gray-900">{a.symbol}</span>
                      <span className="text-gray-500 text-sm ml-2">{TYPE_LABEL[a.type]} {COND_LABEL[a.condition]} <span className="text-gray-900 font-semibold">{a.threshold}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-xs">{a.triggeredAt?new Date(a.triggeredAt).toLocaleString('fr-FR'):''}</p>
                      <Button variant="outline" size="xs" leftIcon={<RefreshCw size={11}/>} onClick={() => toggleAlert(a.id)}>Réactiver</Button>
                      <button onClick={() => deleteAlert(a.id, a.symbol)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts list */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Toutes les alertes</p>
          <p className="text-gray-400 text-xs">{alerts.length} alerte{alerts.length>1?'s':''} au total</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin"/>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
              <Bell size={24} className="text-amber-400"/>
            </div>
            <p className="font-semibold text-gray-700 mb-1">Aucune alerte configurée</p>
            <p className="text-xs text-gray-400 mb-4">Créez votre première alerte pour surveiller le marché.</p>
            <Button variant="brand" size="sm" leftIcon={<Plus size={13}/>} onClick={() => setShowForm(true)}>
              Créer une alerte
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {alerts.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, height:0 }} transition={{ delay:i*.03 }}
                  className={cn('flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors',
                    a.triggered && 'bg-amber-50/50', !a.active && !a.triggered && 'opacity-60')}>

                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    a.triggered ? 'bg-amber-100 text-amber-600' :
                    a.active    ? 'bg-green-100 text-green-600' :
                                  'bg-gray-100 text-gray-400')}>
                    {TYPE_ICON[a.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{a.symbol}</span>
                      <span className="text-gray-500 text-sm">
                        {TYPE_LABEL[a.type]} {COND_LABEL[a.condition]}{' '}
                        <span className="text-gray-900 font-semibold">{a.threshold}</span>
                      </span>
                      <Badge variant={a.triggered?'gold':a.active?'green':'white'} size="sm">
                        {a.triggered?'Déclenchée':a.active?'Active':'Inactive'}
                      </Badge>
                    </div>
                    {a.message && <p className="text-gray-400 text-xs mt-0.5 truncate">{a.message}</p>}
                    {a.triggeredAt && (
                      <p className="text-gray-400 text-xs mt-0.5">Déclenché le {new Date(a.triggeredAt).toLocaleString('fr-FR')}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleAlert(a.id)}
                      className={cn('p-2 rounded-xl transition-all',
                        a.active
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50')}>
                      <Check size={14}/>
                    </button>
                    <button onClick={() => deleteAlert(a.id, a.symbol)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle alerte"
        description="Configurez les conditions de déclenchement" size="lg">
        <div className="space-y-4">
          <Input label="Symbole" value={form.symbol}
            onChange={e => setForm(p => ({...p, symbol:e.target.value.toUpperCase()}))}
            placeholder="ex: AAPL, MSFT, NVDA..." leftIcon={<Bell size={14}/>}/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({...p, type:e.target.value}))}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500/50">
                <option value="PRICE">Prix ($)</option>
                <option value="PERCENT_CHANGE">Variation (%)</option>
                <option value="VOLUME">Volume</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Condition</label>
              <select value={form.condition} onChange={e => setForm(p => ({...p, condition:e.target.value}))}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500/50">
                <option value="ABOVE">Au-dessus de</option>
                <option value="BELOW">En-dessous de</option>
              </select>
            </div>
          </div>
          <Input label="Seuil" type="number" value={form.threshold}
            onChange={e => setForm(p => ({...p, threshold:e.target.value}))}
            placeholder="ex: 200" leftIcon={<Target size={14}/>}/>
          <Input label="Message (optionnel)" value={form.message}
            onChange={e => setForm(p => ({...p, message:e.target.value}))}
            placeholder="ex: AAPL a atteint mon objectif TP"/>
          {form.symbol && form.threshold && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Aperçu</p>
              <p className="text-gray-900 text-sm">
                Alerte quand <span className="text-green-600 font-bold">{form.symbol}</span>{' '}
                ({TYPE_LABEL[form.type]}) est{' '}
                <span className="font-semibold">{COND_LABEL[form.condition]} {form.threshold}</span>
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button variant="brand" onClick={createAlert} leftIcon={<Bell size={14}/>}
              disabled={!form.symbol || !form.threshold}>
              Créer l'alerte
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
