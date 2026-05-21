'use client'

import { useEffect, useState } from 'react'
import {
  User, Mail, Building2, Shield, Bell, Monitor, Sun, Moon,
  Save, Key, Trash2, RefreshCw, Check,
} from 'lucide-react'
import api from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface UserData {
  name: string; email: string; role: string
  organization: { name: string; plan: string }
}

type Tab = 'profile' | 'security' | 'notifications' | 'appearance'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'profile',       label: 'Profil',         Icon: User    },
  { key: 'security',      label: 'Sécurité',       Icon: Shield  },
  { key: 'notifications', label: 'Notifications',  Icon: Bell    },
  { key: 'appearance',    label: 'Apparence',      Icon: Monitor },
]

export default function SettingsPage() {
  const [user, setUser]     = useState<UserData | null>(null)
  const [tab,  setTab]      = useState<Tab>('profile')
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    api.get('/users/me').then(r => {
      setUser(r.data); setName(r.data.name ?? '')
    }).catch(() => {})
  }, [])

  const saveProfile = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.patch('/users/me', { name })
      setUser(u => u ? { ...u, name } : u)
      toast.success('Profil mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) return
    if (pwForm.next !== pwForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    if (pwForm.next.length < 8) { toast.error('Minimum 8 caractères'); return }
    setPwSaving(true)
    try {
      await api.patch('/users/me/password', { current: pwForm.current, password: pwForm.next })
      toast.success('Mot de passe modifié')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erreur')
    } finally { setPwSaving(false) }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <Shield size={11} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Paramètres</span>
        {user && (
          <>
            <div className="w-px h-3.5 bg-[var(--fin-border)]"/>
            <span className="text-[10px] font-mono text-[var(--fin-t3)]">
              {user.organization.name} · <span className={cn('font-bold', user.organization.plan === 'FREE' ? 'text-[var(--fin-t3)]' : 'text-[var(--fin-amber)]')}>{user.organization.plan}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left nav */}
        <aside className="w-44 flex-shrink-0 border-r border-[var(--fin-border)] bg-[var(--fin-panel)] p-2 space-y-0.5">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors text-left',
                tab === key
                  ? 'bg-[var(--fin-active)] text-[var(--fin-blue)]'
                  : 'text-[var(--fin-t2)] hover:bg-[var(--fin-hover)] hover:text-[var(--fin-t1)]'
              )}>
              <Icon size={13} strokeWidth={1.5} className="flex-shrink-0"/>
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-lg space-y-6">

            {/* ── PROFIL ── */}
            {tab === 'profile' && (
              <>
                <Section title="Informations personnelles" icon={User}>
                  <div className="space-y-4">
                    <Input label="Nom complet" value={name} onChange={e => setName(e.target.value)}
                      leftIcon={<User size={14}/>}/>
                    <Input label="Email" value={user?.email ?? ''} disabled
                      leftIcon={<Mail size={14}/>}
                      className="opacity-60 cursor-not-allowed"/>
                    <Input label="Organisation" value={user?.organization?.name ?? ''} disabled
                      leftIcon={<Building2 size={14}/>}
                      className="opacity-60 cursor-not-allowed"/>
                    <div className="flex justify-end">
                      <Button onClick={saveProfile} loading={saving} size="sm"
                        leftIcon={saving ? undefined : <Save size={13}/>}>
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </Section>

                <Section title="Plan actuel" icon={Shield}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--fin-surface)] border border-[var(--fin-border)]">
                    <div>
                      <p className="text-sm font-bold text-[var(--fin-t1)]">{user?.organization?.plan ?? '—'}</p>
                      <p className="text-xs text-[var(--fin-t3)]">{user?.organization?.name}</p>
                    </div>
                    <a href="/billing" className="text-xs text-[var(--fin-blue)] hover:underline font-medium">
                      Changer de plan →
                    </a>
                  </div>
                </Section>
              </>
            )}

            {/* ── SÉCURITÉ ── */}
            {tab === 'security' && (
              <Section title="Changer le mot de passe" icon={Key}>
                <div className="space-y-4">
                  <Input label="Mot de passe actuel" type="password"
                    value={pwForm.current} onChange={e => setPwForm(p => ({...p, current: e.target.value}))}
                    leftIcon={<Key size={14}/>}/>
                  <Input label="Nouveau mot de passe" type="password"
                    value={pwForm.next} onChange={e => setPwForm(p => ({...p, next: e.target.value}))}
                    leftIcon={<Key size={14}/>}/>
                  <Input label="Confirmer le mot de passe" type="password"
                    value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))}
                    leftIcon={<Check size={14}/>}
                    error={pwForm.confirm && pwForm.next !== pwForm.confirm ? 'Les mots de passe ne correspondent pas' : undefined}/>
                  <div className="flex justify-end">
                    <Button onClick={changePassword} loading={pwSaving} size="sm" variant="primary">
                      Mettre à jour
                    </Button>
                  </div>
                </div>
              </Section>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === 'notifications' && (
              <Section title="Préférences de notifications" icon={Bell}>
                <div className="space-y-3">
                  {[
                    { label: 'Alertes de prix déclenchées',   desc: 'Notification quand une alerte est activée', defaultOn: true  },
                    { label: 'Résultats d\'entreprises',       desc: 'Rappel 1h avant les publications',          defaultOn: true  },
                    { label: 'Mises à jour de portefeuille',  desc: 'Résumé quotidien des performances',          defaultOn: false },
                    { label: 'Actualités du marché',           desc: 'Breaking news sur vos titres suivis',        defaultOn: false },
                  ].map(({ label, desc, defaultOn }) => (
                    <NotifRow key={label} label={label} desc={desc} defaultOn={defaultOn}/>
                  ))}
                </div>
              </Section>
            )}

            {/* ── APPARENCE ── */}
            {tab === 'appearance' && (
              <Section title="Thème d'interface" icon={Monitor}>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'dark',  label: 'Terminal sombre', desc: 'Bloomberg × TradingView', Icon: Moon  },
                    { key: 'light', label: 'Institutionnel',  desc: 'FactSet × Capital IQ',    Icon: Sun   },
                  ] as const).map(({ key, label, desc, Icon }) => (
                    <button key={key} onClick={() => setTheme(key)}
                      className={cn(
                        'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all',
                        theme === key
                          ? 'border-[var(--fin-blue)] bg-[var(--fin-active)] text-[var(--fin-blue)]'
                          : 'border-[var(--fin-border)] bg-[var(--fin-surface)] text-[var(--fin-t2)] hover:border-[var(--fin-border-2)] hover:text-[var(--fin-t1)]'
                      )}>
                      <Icon size={18} strokeWidth={1.5}/>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-[10px] text-[var(--fin-t3)]">{desc}</p>
                      {theme === key && (
                        <span className="text-[9px] font-bold font-mono text-[var(--fin-blue)] uppercase tracking-wider">Actif</span>
                      )}
                    </button>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--fin-border)] overflow-hidden bg-[var(--fin-panel)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--fin-border)] bg-[var(--fin-surface)]">
        <Icon size={12} strokeWidth={1.5} className="text-[var(--fin-t3)]"/>
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function NotifRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--fin-border)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--fin-t1)]">{label}</p>
        <p className="text-xs text-[var(--fin-t3)]">{desc}</p>
      </div>
      <button onClick={() => setOn(v => !v)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          on ? 'bg-[var(--fin-blue)]' : 'bg-[var(--fin-surface)] border border-[var(--fin-border-2)]'
        )}>
        <span className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white shadow-sm',
          on ? 'left-[18px]' : 'left-0.5'
        )}/>
      </button>
    </div>
  )
}
