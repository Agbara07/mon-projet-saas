'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, Mail, Lock, Eye, EyeOff,
  ArrowRight, Check, Shield, Zap, Star, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { toast } from 'sonner'

const schema = z.object({
  name:     z.string().min(2, '2 caractères minimum'),
  orgName:  z.string().min(2, '2 caractères minimum'),
  email:    z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
})
type FormData = z.infer<typeof schema>

function passwordStrength(pw: string): { score: number; label: string; color: 'red'|'gold'|'green'|'blue' } {
  if (!pw) return { score:0, label:'', color:'red' }
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score:20, label:'Très faible', color:'red' }
  if (s === 2) return { score:40, label:'Faible', color:'red' }
  if (s === 3) return { score:60, label:'Moyen', color:'gold' }
  if (s === 4) return { score:80, label:'Fort', color:'green' }
  return { score:100, label:'Très fort', color:'blue' }
}

const PERKS = [
  { icon:<Zap size={14}/>,  text:'Setup en 2 minutes', sub:'Aucune carte bancaire requise' },
  { icon:<Star size={14}/>, text:'14 jours gratuits', sub:'Toutes les fonctionnalités Pro' },
  { icon:<Shield size={14}/>,text:'Données sécurisées', sub:'Chiffrement AES-256 · RGPD' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [apiError, setApiError] = useState('')
  const [pwValue, setPwValue]   = useState('')

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const strength = passwordStrength(pwValue)

  const onSubmit = async (data: FormData) => {
    setLoading(true); setApiError('')
    try {
      const res = await api.post('/auth/register', data)
      localStorage.setItem('accessToken',  res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      toast.success('Compte créé avec succès !')
      router.push('/dashboard')
    } catch (e: any) {
      setApiError(e?.response?.data?.message ?? 'Une erreur est survenue')
      setLoading(false)
    }
  }

  const FIELDS = [
    {
      name:'name' as const,
      label:'Votre nom complet',
      type:'text',
      placeholder:'Jean Dupont',
      icon:<User size={15}/>,
      autocomplete:'name',
    },
    {
      name:'orgName' as const,
      label:'Nom de votre organisation',
      type:'text',
      placeholder:'Acme Capital',
      icon:<Building2 size={15}/>,
      autocomplete:'organization',
    },
    {
      name:'email' as const,
      label:'Adresse email',
      type:'email',
      placeholder:'vous@exemple.com',
      icon:<Mail size={15}/>,
      autocomplete:'email',
    },
  ]

  return (
    <div className="min-h-screen bg-black flex">

      {/* ── Left panel ──────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-zinc-950 border-r border-white/[.04]">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-green-600/8 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-blue-600/6 rounded-full blur-3xl"/>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center font-black text-black text-base">I</div>
            <span className="font-bold text-white text-lg">InvestSaaS</span>
          </Link>

          <div>
            <motion.h2 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }}
              className="text-4xl font-black text-white leading-tight mb-4">
              Commencez à investir<br/>
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                intelligemment.
              </span>
            </motion.h2>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
              className="text-zinc-400 text-base mb-10">
              Rejoignez 12 400+ investisseurs qui utilisent InvestSaaS chaque jour.
            </motion.p>

            <div className="space-y-4 mb-10">
              {PERKS.map((p, i) => (
                <motion.div key={p.text} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay: .4 + i * .1 }}
                  className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{p.text}</p>
                    <p className="text-zinc-500 text-xs">{p.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Social proof */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.8 }}
              className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['bg-blue-500','bg-purple-500','bg-green-500','bg-yellow-500'].map((c, i) => (
                  <div key={i} className={cn('w-8 h-8 rounded-full border-2 border-zinc-950 flex items-center justify-center text-white text-xs font-bold', c)}>
                    {['M','T','S','A'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">{[...Array(5)].map((_,i) => <span key={i} className="text-yellow-400 text-xs">★</span>)}</div>
                <p className="text-zinc-500 text-xs">4.9/5 · 847 avis vérifiés</p>
              </div>
            </motion.div>
          </div>

          <p className="text-zinc-700 text-xs">
            © 2025 InvestSaaS · Données chiffrées · Hébergé en Europe
          </p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 overflow-y-auto">
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:.5, ease:[.22,1,.36,1] }}
          className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-7 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center font-black text-black text-sm">I</div>
            <span className="font-bold text-white">InvestSaaS</span>
          </Link>

          <h1 className="text-2xl font-black text-white mb-1">Créer votre compte</h1>
          <p className="text-zinc-500 text-sm mb-7">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
              Se connecter
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Text fields */}
            {FIELDS.map((f, i) => (
              <motion.div key={f.name} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * .06 }}>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{f.label}</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                    {f.icon}
                  </div>
                  <input
                    {...register(f.name)}
                    type={f.type}
                    placeholder={f.placeholder}
                    autoComplete={f.autocomplete}
                    className={cn(
                      'w-full bg-zinc-900 border text-white placeholder-zinc-600 rounded-xl px-4 py-3 pl-10 text-sm',
                      'focus:outline-none focus:ring-2 transition-all hover:border-zinc-700',
                      errors[f.name]
                        ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                        : 'border-zinc-800 focus:border-green-500/50 focus:ring-green-500/10'
                    )}
                  />
                </div>
                <AnimatePresence>
                  {errors[f.name] && (
                    <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                      className="text-red-400 text-xs mt-1.5">{errors[f.name]?.message}</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {/* Password with strength meter */}
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.24 }}>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                <input
                  {...register('password', {
                    onChange: e => setPwValue(e.target.value)
                  })}
                  type={showPw ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  className={cn(
                    'w-full bg-zinc-900 border text-white placeholder-zinc-600 rounded-xl px-4 py-3 pl-10 pr-10 text-sm',
                    'focus:outline-none focus:ring-2 transition-all hover:border-zinc-700',
                    errors.password
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                      : 'border-zinc-800 focus:border-green-500/50 focus:ring-green-500/10'
                  )}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>

              {/* Password strength */}
              <AnimatePresence>
                {pwValue && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                    exit={{ opacity:0, height:0 }} className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Progress value={strength.score} color={strength.color} size="sm" className="flex-1 mr-3"/>
                      <span className={cn('text-xs font-semibold whitespace-nowrap',
                        strength.color==='red'?'text-red-400':
                        strength.color==='gold'?'text-yellow-400':
                        strength.color==='blue'?'text-blue-400':'text-green-400')}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { ok: pwValue.length >= 8,       text:'8+ caractères' },
                        { ok: /[A-Z]/.test(pwValue),     text:'Majuscule' },
                        { ok: /[0-9]/.test(pwValue),     text:'Chiffre' },
                        { ok: /[^A-Za-z0-9]/.test(pwValue), text:'Symbole' },
                      ].map(({ ok, text }) => (
                        <span key={text} className={cn('flex items-center gap-1 text-xs transition-colors',
                          ok ? 'text-green-400' : 'text-zinc-600')}>
                          <Check size={10} strokeWidth={ok ? 3 : 1}/>
                          {text}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="text-red-400 text-xs mt-1.5">{errors.password.message}</motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* API error */}
            <AnimatePresence>
              {apiError && (
                <motion.div initial={{ opacity:0, y:-8, scale:.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs flex-shrink-0">!</span>
                  {apiError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button type="submit" variant="brand" size="lg" loading={loading} className="w-full mt-2"
              rightIcon={!loading && <ArrowRight size={16}/>}>
              {loading ? 'Création du compte...' : 'Créer mon compte gratuit'}
            </Button>
          </form>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {[
              { icon:<Shield size={12}/>, text:'AES-256' },
              { icon:<Check size={12}/>,  text:'RGPD' },
              { icon:<Zap size={12}/>,    text:'99.9% uptime' },
            ].map(b => (
              <span key={b.text} className="flex items-center gap-1 text-xs text-zinc-600">
                {b.icon} {b.text}
              </span>
            ))}
          </div>

          <p className="text-center text-zinc-700 text-xs mt-4">
            En créant un compte, vous acceptez nos{' '}
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors">CGU</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
