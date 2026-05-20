'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Building2, CreditCard, TrendingUp, Search,
  Shield, Crown, UserCheck, RefreshCw, Download,
  ChevronUp, ChevronDown, Activity, Filter,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: string; name: string; email: string; role: string
  createdAt: string; organization: { name: string }
}
interface Organization {
  id: string; name: string; plan: string; createdAt: string
  _count: { users: number }; subscriptions: { status: string }[]
}
type Tab = 'overview' | 'users' | 'organizations'

const PLAN_COLORS: Record<string, string> = {
  FREE:'#52525b', PRO:'#3b82f6', ENTERPRISE:'#eab308',
}
const ROLE_CONFIG: Record<string, { label:string; variant:'purple'|'blue'|'white' }> = {
  OWNER: { label:'Owner',  variant:'purple' },
  ADMIN: { label:'Admin',  variant:'blue'   },
  MEMBER:{ label:'Member', variant:'white'  },
}
const STATUS_CONFIG: Record<string, { label:string; variant:'green'|'red'|'white' }> = {
  ACTIVE:   { label:'Actif',    variant:'green' },
  INACTIVE: { label:'Inactif',  variant:'red'   },
  PAST_DUE: { label:'En retard',variant:'red'   },
  CANCELED: { label:'Annulé',  variant:'white'  },
}

type SortDir = 'asc'|'desc'

function SortBtn({ active, dir, onClick }: { active:boolean; dir:SortDir; onClick:()=>void }) {
  return (
    <button onClick={onClick} className="ml-1 inline-flex flex-col gap-0">
      <ChevronUp  size={9} className={cn(active && dir==='asc'  ? 'text-white' : 'text-zinc-700')}/>
      <ChevronDown size={9} className={cn(active && dir==='desc' ? 'text-white' : 'text-zinc-700')}/>
    </button>
  )
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-bold">{p.value}</p>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab]         = useState<Tab>('overview')
  const [users, setUsers]     = useState<User[]>([])
  const [orgs, setOrgs]       = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [orgSearch, setOrgSearch]   = useState('')
  const [userSort, setUserSort]     = useState<{ key:keyof User|'orgName'; dir:SortDir }>({ key:'createdAt', dir:'desc' })
  const [orgSort, setOrgSort]       = useState<{ key:string; dir:SortDir }>({ key:'createdAt', dir:'desc' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      toast.error('Vous devez être connecté pour accéder à cette page')
      router.push('/login')
      return
    }
    try {
      const [u, o] = await Promise.all([api.get('/admin/users'), api.get('/admin/organizations')])
      setUsers(u.data)
      setOrgs(o.data)
      setAuthError(false)
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        setAuthError(true)
      } else {
        toast.error('Erreur lors du chargement des données')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Computed stats ───────────────────────────────
  const activeSubscriptions = useMemo(() => orgs.filter(o => o.subscriptions[0]?.status === 'ACTIVE').length, [orgs])
  const proPlus             = useMemo(() => orgs.filter(o => o.plan !== 'FREE').length, [orgs])

  const planDistribution = useMemo(() => {
    const counts: Record<string,number> = {}
    orgs.forEach(o => { counts[o.plan] = (counts[o.plan]||0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: PLAN_COLORS[name] ?? '#52525b' }))
  }, [orgs])

  const signupsPerMonth = useMemo(() => {
    const counts: Record<string,number> = {}
    users.forEach(u => {
      const m = u.createdAt.slice(0, 7)
      counts[m] = (counts[m] || 0) + 1
    })
    return Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)).slice(-6)
      .map(([month, count]) => ({ month: month.slice(5), count }))
  }, [users])

  // ── Filtered & sorted users ──────────────────────
  const filteredUsers = useMemo(() => {
    let list = users.filter(u =>
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.organization.name.toLowerCase().includes(userSearch.toLowerCase())
    )
    return list.sort((a, b) => {
      const va = userSort.key === 'orgName' ? a.organization.name : (a as any)[userSort.key] ?? ''
      const vb = userSort.key === 'orgName' ? b.organization.name : (b as any)[userSort.key] ?? ''
      return userSort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [users, userSearch, userSort])

  const filteredOrgs = useMemo(() => {
    let list = orgs.filter(o =>
      !orgSearch || o.name.toLowerCase().includes(orgSearch.toLowerCase())
    )
    return list.sort((a, b) => {
      const va = (a as any)[orgSort.key] ?? ''
      const vb = (b as any)[orgSort.key] ?? ''
      return orgSort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [orgs, orgSearch, orgSort])

  const sortUser = (key: typeof userSort['key']) => {
    setUserSort(p => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }))
  }
  const sortOrg = (key: string) => {
    setOrgSort(p => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }))
  }

  const STATS = [
    { label:'Utilisateurs',       value:users.length,        icon:<Users size={18}/>,       color:'text-blue-400',   bg:'bg-blue-500/10',   delta:'+12%' },
    { label:'Organisations',      value:orgs.length,          icon:<Building2 size={18}/>,   color:'text-purple-400', bg:'bg-purple-500/10', delta:'+8%'  },
    { label:'Abonnements actifs', value:activeSubscriptions,  icon:<CreditCard size={18}/>,  color:'text-green-400',  bg:'bg-green-500/10',  delta:'+5%'  },
    { label:'Plans payants',      value:proPlus,              icon:<TrendingUp size={18}/>,  color:'text-yellow-400', bg:'bg-yellow-500/10', delta:'+23%' },
  ]

  const TABS: { id:Tab; label:string; icon:React.ReactNode; count?:number }[] = [
    { id:'overview',       label:'Vue d\'ensemble', icon:<Activity size={14}/>  },
    { id:'users',          label:'Utilisateurs',    icon:<Users size={14}/>,      count:users.length     },
    { id:'organizations',  label:'Organisations',   icon:<Building2 size={14}/>,  count:orgs.length      },
  ]

  if (loading) return <PageLoader />

  if (authError) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <Shield size={32} className="text-red-400"/>
      </div>
      <div>
        <h2 className="text-xl font-black text-white mb-2">Accès refusé</h2>
        <p className="text-zinc-400 text-sm max-w-sm">
          Vous devez être connecté avec un compte <span className="text-white font-semibold">OWNER</span> ou <span className="text-white font-semibold">ADMIN</span> pour accéder à cette page.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => router.push('/login')}
          className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-all">
          Se connecter
        </button>
        <button onClick={() => router.push('/register')}
          className="border border-white/10 text-zinc-300 px-6 py-2.5 rounded-xl text-sm font-medium hover:border-white/20 transition-all">
          Créer un compte
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* ── Header ──────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Shield size={22} className="text-red-400"/> Administration
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Vue globale de la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="red">Admin</Badge>
          <button onClick={fetchData}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </motion.div>

      {/* ── Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(({ label, value, icon, color, bg, delta }, i) => (
          <motion.div key={label} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.07 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg, color)}>{icon}</div>
                <span className="text-green-400 text-xs font-semibold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  {delta}
                </span>
              </div>
              <p className="text-white text-3xl font-black tabular-nums">{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-white/[.05]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all',
              tab===t.id ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300')}>
            {t.icon} {t.label}
            {t.count !== undefined && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-md',
                tab===t.id ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          exit={{ opacity:0 }} transition={{ duration:.2 }}>

          {/* ── OVERVIEW ──────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Signups chart */}
                <Card className="p-5">
                  <p className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-400"/> Inscriptions (6 derniers mois)
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={signupsPerMonth} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:'#52525b'}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#52525b'}} tickLine={false} axisLine={false}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Bar dataKey="count" fill="#3b82f6" radius={[6,6,0,0]} maxBarSize={32}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Plan distribution */}
                <Card className="p-5">
                  <p className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <CreditCard size={14} className="text-yellow-400"/> Répartition des plans
                  </p>
                  {planDistribution.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                            dataKey="value" paddingAngle={3}>
                            {planDistribution.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0}/>)}
                          </Pie>
                          <Tooltip contentStyle={{background:'#18181b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px'}} itemStyle={{color:'#fff'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {planDistribution.map(p => (
                          <div key={p.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/>
                              <span className="text-zinc-400 text-sm">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm tabular-nums">{p.value}</span>
                              <span className="text-zinc-600 text-xs">
                                {((p.value/orgs.length)*100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-zinc-600">
                      <p>Aucune donnée</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Recent signups */}
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[.05] flex items-center justify-between">
                  <p className="font-bold text-white text-sm">Dernières inscriptions</p>
                  <button onClick={() => setTab('users')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Voir tous →
                  </button>
                </div>
                <div className="divide-y divide-white/[.03]">
                  {users.slice(0, 5).map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:i*.04 }}
                      className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.name||'?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{u.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={ROLE_CONFIG[u.role]?.variant ?? 'white'} size="sm">
                          {ROLE_CONFIG[u.role]?.label ?? u.role}
                        </Badge>
                        <span className="text-zinc-600 text-xs">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Rechercher par nom, email ou organisation..."
                  leftIcon={<Search size={14}/>} className="max-w-sm"/>
                <span className="text-zinc-500 text-xs ml-auto">
                  {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}
                </span>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[.04]">
                        {[
                          { key:'name',    label:'Utilisateur' },
                          { key:'email',   label:'Email' },
                          { key:'role',    label:'Rôle' },
                          { key:'orgName', label:'Organisation' },
                          { key:'createdAt',label:'Inscrit le' },
                        ].map(col => (
                          <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortBtn active={userSort.key===col.key} dir={userSort.dir}
                                onClick={() => sortUser(col.key as any)}/>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredUsers.map((u, i) => (
                          <motion.tr key={u.id}
                            initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                            transition={{ delay: Math.min(i,20)*.03 }}
                            className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/50 to-purple-600/50 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {(u.name||'?')[0].toUpperCase()}
                                </div>
                                <span className="font-semibold text-white">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{u.email}</td>
                            <td className="px-4 py-3">
                              <Badge variant={ROLE_CONFIG[u.role]?.variant ?? 'white'} size="sm">
                                {ROLE_CONFIG[u.role]?.label ?? u.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-zinc-400 text-sm">{u.organization.name}</td>
                            <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                              {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>

                  {filteredUsers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                      <Users size={32} className="mb-2 opacity-30"/>
                      <p>Aucun utilisateur trouvé</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── ORGANIZATIONS ─────────────────────────── */}
          {tab === 'organizations' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
                  placeholder="Rechercher une organisation..."
                  leftIcon={<Search size={14}/>} className="max-w-sm"/>
                <span className="text-zinc-500 text-xs ml-auto">
                  {filteredOrgs.length} résultat{filteredOrgs.length > 1 ? 's' : ''}
                </span>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[.04]">
                        {[
                          { key:'name',      label:'Organisation' },
                          { key:'plan',      label:'Plan' },
                          { key:'_count',    label:'Membres' },
                          { key:'sub',       label:'Abonnement' },
                          { key:'createdAt', label:'Créée le' },
                        ].map(col => (
                          <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortBtn active={orgSort.key===col.key} dir={orgSort.dir}
                                onClick={() => sortOrg(col.key)}/>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredOrgs.map((o, i) => {
                          const status = o.subscriptions[0]?.status ?? 'INACTIVE'
                          const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['INACTIVE']
                          return (
                            <motion.tr key={o.id}
                              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                              transition={{ delay: Math.min(i,20)*.03 }}
                              className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {o.name[0].toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-white">{o.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={o.plan==='ENTERPRISE'?'gold':o.plan==='PRO'?'blue':'white'}
                                  size="sm">
                                  {o.plan==='ENTERPRISE' && <Crown size={9}/>}
                                  {o.plan}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-zinc-400 text-sm">
                                  <Users size={12}/> {o._count.users}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                                {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>

                  {filteredOrgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                      <Building2 size={32} className="mb-2 opacity-30"/>
                      <p>Aucune organisation trouvée</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
