'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(6, '6 caractères minimum'),
})
type FormData = z.infer<typeof schema>

const FEATURES = [
  { icon: <BarChart3 size={16}/>, text: 'Portfolio temps réel' },
  { icon: <Zap size={16}/>,       text: 'Alertes instantanées' },
  { icon: <TrendingUp size={16}/>,text: 'Screener institutionnel' },
  { icon: <Shield size={16}/>,    text: 'Chiffrement AES-256' },
]

const TICKERS = [
  { s:'AAPL', p:'$213.42', c:'+1.24%', up:true  },
  { s:'NVDA', p:'$127.85', c:'+3.41%', up:true  },
  { s:'TSLA', p:'$248.50', c:'-1.12%', up:false },
  { s:'MSFT', p:'$428.73', c:'+0.87%', up:true  },
  { s:'META', p:'$612.10', c:'+2.31%', up:true  },
]

export default function LoginPage() {
  const router  = useRouter()
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true); setApiError('')
    try {
      const res = await api.post('/auth/login', data)
      localStorage.setItem('accessToken',  res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      toast.success('Connexion réussie')
      router.push('/dashboard')
    } catch (e: any) {
      setApiError(e?.response?.data?.message ?? 'Identifiants invalides')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex">

      {/* ── Left panel — decorative ─────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-zinc-950 border-r border-white/[.04]">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-green-600/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl"/>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center font-black text-black text-base shadow-lg shadow-green-500/20">I</div>
            <span className="font-bold text-white text-lg">InvestSaaS</span>
          </Link>

          {/* Hero text */}
          <div>
            <motion.h2 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }}
              className="text-4xl font-black text-white leading-tight mb-4">
              Investissez avec la<br/>
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                précision des pros.
              </span>
            </motion.h2>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.35 }}
              className="text-zinc-400 text-base leading-relaxed max-w-sm mb-8">
              Portfolio tracker temps réel, screener institutionnel, alertes intelligentes.
            </motion.p>

            {/* Feature list */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.text} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay: .4 + i * .08 }}
                  className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    {f.icon}
                  </div>
                  {f.text}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Live ticker */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.7 }}
            className="bg-zinc-900/60 border border-white/[.05] rounded-2xl p-4">
            <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-3">Marchés en direct</p>
            <div className="space-y-2">
              {TICKERS.map(t => (
                <div key={t.s} className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs font-mono">{t.s}</span>
                  <span className="text-white text-xs font-bold tabular-nums">{t.p}</span>
                  <span className={cn('text-xs font-semibold tabular-nums', t.up ? 'text-green-400' : 'text-red-400')}>
                    {t.c}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:.5, ease:[.22,1,.36,1] }}
          className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center font-black text-black text-sm">I</div>
            <span className="font-bold text-white">InvestSaaS</span>
          </Link>

          <h1 className="text-2xl font-black text-white mb-1">Content de vous revoir</h1>
          <p className="text-zinc-500 text-sm mb-7">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
              Créer un compte
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  className={cn(
                    'w-full bg-zinc-900 border text-white placeholder-zinc-600 rounded-xl px-4 py-3 pl-10 text-sm',
                    'focus:outline-none focus:ring-2 transition-all hover:border-zinc-700',
                    errors.email
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                      : 'border-zinc-800 focus:border-green-500/50 focus:ring-green-500/10'
                  )}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="text-red-400 text-xs mt-1.5">{errors.email.message}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mot de passe</label>
                <Link href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Mot de passe oublié ?</Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="text-red-400 text-xs mt-1.5">{errors.password.message}</motion.p>
                )}
              </AnimatePresence>
            </div>

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
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-800"/>
            <span className="text-zinc-600 text-xs">Sécurisé par chiffrement AES-256</span>
            <div className="flex-1 h-px bg-zinc-800"/>
          </div>

          <p className="text-center text-zinc-700 text-xs">
            En continuant, vous acceptez nos{' '}
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors">CGU</Link>
            {' '}et notre{' '}
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors">Politique de confidentialité</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
