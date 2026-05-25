'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  TrendingUp, Bell, Search, Calendar,
  Shield, Lock, Zap, Users, BarChart3, ArrowRight, Check,
  ChevronDown, Star, Globe, Cpu, Activity,
  AlertTriangle, Target, Award, Sparkles, Play,
  Crown, LineChart, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Types ───────────────────────────────────────────────── */
interface TickerItem {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
}

/* ─── Ticker statique (fallback cold-start Railway) ──────── */
const TICKER_FALLBACK = [
  { symbol:'SPY',   name:'S&P 500',    price:568.42,  changePercent:0.62 },
  { symbol:'QQQ',   name:'NASDAQ',     price:489.31,  changePercent:0.89 },
  { symbol:'AAPL',  name:'Apple',      price:308.82,  changePercent:1.26 },
  { symbol:'NVDA',  name:'NVIDIA',     price:127.85,  changePercent:3.41 },
  { symbol:'TSLA',  name:'Tesla',      price:248.50,  changePercent:-1.12 },
  { symbol:'MSFT',  name:'Microsoft',  price:428.73,  changePercent:0.87 },
  { symbol:'AMZN',  name:'Amazon',     price:196.40,  changePercent:1.88 },
  { symbol:'META',  name:'Meta',       price:612.10,  changePercent:2.31 },
  { symbol:'GOOGL', name:'Alphabet',   price:178.23,  changePercent:0.54 },
]

/* ─── Plans pricing (source : billing page) ──────────────── */
const PLANS = [
  {
    key:    'FREE',
    name:   'Gratuit',
    price:  '0',
    icon:   <Shield size={20}/>,
    color:  'text-zinc-400',
    border: 'border-white/[.06]',
    features: [
      '1 portefeuille',
      '10 titres en watchlist',
      '5 alertes actives',
      'BRVM temps réel',
      '1 an d\'historique',
      'Dashboard marché',
    ],
  },
  {
    key:    'STARTER',
    name:   'Starter',
    price:  '9',
    icon:   <Zap size={20}/>,
    color:  'text-blue-400',
    border: 'border-blue-500/20',
    features: [
      'Portefeuilles illimités',
      'Watchlist illimitée',
      '50 alertes actives',
      'Screener actions + ETF',
      '3 ans d\'historique',
      'App mobile',
    ],
  },
  {
    key:    'PRO',
    name:   'Pro',
    price:  '29',
    badge:  'Populaire',
    icon:   <Star size={20}/>,
    color:  'text-green-400',
    border: 'border-green-500/30',
    features: [
      'Tout Starter inclus',
      '500 alertes actives',
      '10 ans d\'historique',
      'Export CSV',
      'Accès API REST + WebSocket',
      'Alertes WebSocket instantanées',
    ],
  },
  {
    key:    'ADVISOR',
    name:   'Advisor',
    price:  '79',
    icon:   <Crown size={20}/>,
    color:  'text-yellow-400',
    border: 'border-yellow-500/20',
    features: [
      'Tout Pro inclus',
      'Portefeuilles clients',
      'Rapports PDF (200/mois)',
      'Screener fonds',
      'Features conseiller',
      'Support prioritaire',
    ],
  },
]

/* ─── Features sections ───────────────────────────────────── */
const SECTIONS = [
  {
    badge:'Portfolio temps réel', badgeColor:'green' as const, icon:<BarChart3 size={16}/>,
    title:['Votre portefeuille,','mis à jour en direct.'],
    accent:'green',
    desc:'P&L instantané sur toutes vos positions. Graphiques Recharts interactifs, répartition sectorielle, historique complet de chaque transaction.',
    features:['Graphiques interactifs avec zoom 1j→5ans','P&L par position et global en temps réel','Répartition en camembert par secteur','Synchronisation WebSocket toutes les 30s','Export CSV de votre historique'],
    mockup:'portfolio',
    reverse: false,
  },
  {
    badge:'Screener institutionnel', badgeColor:'blue' as const, icon:<Search size={16}/>,
    title:['Trouvez vos','prochaines opportunités.'],
    accent:'blue',
    desc:'Filtrez 10 000+ actions par prix, capitalisation, P/E, croissance, marges. Sauvegardez vos filtres, activez-les en un clic.',
    features:['Filtres techniques + fondamentaux combinés','Presets : Top gainers, Value, Large caps','Données fondamentales complètes (revenus, marges)','Ajout direct à la watchlist','Tri cliquable sur toutes les colonnes'],
    mockup:'screener',
    reverse: true,
  },
  {
    badge:'Alertes intelligentes', badgeColor:'gold' as const, icon:<Bell size={16}/>,
    title:['Ne ratez plus','aucun signal.'],
    accent:'gold',
    desc:'Notre moteur évalue vos conditions chaque minute. Notification WebSocket instantanée dès qu\'un seuil est atteint.',
    features:['Alertes prix, variation %, volume anormal','Conditions : au-dessus / en-dessous','Push notifications en temps réel','Moteur cron en arrière-plan','Historique des déclenchements'],
    mockup:'alert',
    reverse: false,
  },
  {
    badge:'Calendrier résultats', badgeColor:'purple' as const, icon:<Calendar size={16}/>,
    title:['Anticipez les','catalyseurs de marché.'],
    accent:'purple',
    desc:'Suivez les annonces trimestrielles des grandes capitalisations. BPA estimé vs réel, taux de surprise, calendrier filtrable.',
    features:['BPA estimé et réel côte-à-côte','Taux de surprise coloré vert/rouge','Vue à venir et résultats passés','Clic → profil complet de l\'action','Mise à jour quotidienne automatique'],
    mockup:'calendar',
    reverse: true,
  },
]

const STATS = [
  {n:'12 400+',l:'Investisseurs actifs',icon:<Users size={20}/>},
  {n:'2.4 Md$',l:'Actifs suivis',icon:<BarChart3 size={20}/>},
  {n:'0$',l:'Commission',icon:<Target size={20}/>},
  {n:'< 200ms',l:'Latence live',icon:<Zap size={20}/>},
]

const PROTECTION = [
  {icon:<Lock size={24}/>,title:'Chiffrement AES-256',desc:'Données chiffrées en transit et au repos.'},
  {icon:<Shield size={24}/>,title:'Protection du compte',desc:'Détection des accès non autorisés 24h/24.'},
  {icon:<Cpu size={24}/>,title:'Double authentification',desc:'2FA disponible sur tous les accès sensibles.'},
  {icon:<Zap size={24}/>,title:'Support réactif',desc:'Réponse garantie en moins de 24 heures.'},
]

const ACCENT: Record<string,{text:string,bg:string,border:string}> = {
  green:  {text:'text-green-400',  bg:'bg-green-500/10',  border:'border-green-500/20'},
  blue:   {text:'text-blue-400',   bg:'bg-blue-500/10',   border:'border-blue-500/20'},
  gold:   {text:'text-yellow-400', bg:'bg-yellow-500/10', border:'border-yellow-500/20'},
  purple: {text:'text-purple-400', bg:'bg-purple-500/10', border:'border-purple-500/20'},
}

/* ─── Mini mockups ────────────────────────────────────────── */
function PortfolioMock() {
  return (
    <div className="bg-zinc-950 rounded-2xl border border-white/[.06] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[.05]">
        <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/60"/><div className="w-3 h-3 rounded-full bg-yellow-500/60"/><div className="w-3 h-3 rounded-full bg-green-500/60"/></div>
        <span className="text-zinc-600 text-xs font-mono ml-2">Portfolio — Vue d'ensemble</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Live</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[{l:'Valeur totale',v:'148 420 $',s:'+12.4% YTD',c:'text-green-400'},{l:'P&L du jour',v:'+3 210 $',s:'+2.21%',c:'text-green-400'},{l:'Dividendes',v:'847 $',s:'Cette année',c:'text-zinc-400'}].map(s=>(
            <div key={s.l} className="bg-zinc-900 rounded-xl p-3 border border-white/[.04]">
              <p className="text-zinc-500 text-xs">{s.l}</p>
              <p className="text-white font-bold text-sm mt-0.5 tabular-nums">{s.v}</p>
              <p className={cn('text-xs mt-0.5',s.c)}>{s.s}</p>
            </div>
          ))}
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-white/[.04]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-xs font-semibold">AAPL</span>
            <div className="flex gap-1">{['1M','3M','1A'].map((p,i)=><span key={p} className={cn('text-xs px-1.5 py-0.5 rounded',i===0?'bg-green-600/30 text-green-400':'text-zinc-600')}>{p}</span>)}</div>
          </div>
          <svg viewBox="0 0 400 80" className="w-full h-16">
            <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity=".2"/><stop offset="100%" stopColor="#22c55e" stopOpacity="0"/></linearGradient></defs>
            <path d="M0,65 C30,60 50,52 80,44 S130,34 160,30 S210,24 250,20 S310,15 350,12 L400,8" fill="none" stroke="#22c55e" strokeWidth="2"/>
            <path d="M0,65 C30,60 50,52 80,44 S130,34 160,30 S210,24 250,20 S310,15 350,12 L400,8 L400,80 L0,80Z" fill="url(#pg)"/>
          </svg>
        </div>
        {[{s:'NVDA',n:'NVIDIA',q:12,p:127.85,pnl:+356,up:true},{s:'MSFT',n:'Microsoft',q:5,p:428.73,pnl:+193,up:true},{s:'TSLA',n:'Tesla',q:8,p:248.5,pnl:-92,up:false}].map(h=>(
          <div key={h.s} className="flex items-center justify-between bg-zinc-900 rounded-xl px-3 py-2.5 border border-white/[.04]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">{h.s[0]}</div>
              <div><p className="text-white text-xs font-semibold">{h.s}</p><p className="text-zinc-500 text-xs">{h.q} actions</p></div>
            </div>
            <div className="text-right">
              <p className="text-white text-xs font-bold">${h.p}</p>
              <p className={cn('text-xs font-semibold',h.up?'text-green-400':'text-red-400')}>{h.up?'+':''}{h.pnl} $</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenerMock() {
  return (
    <div className="bg-zinc-950 rounded-2xl border border-white/[.06] overflow-hidden shadow-2xl p-4 space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-zinc-500"><Search size={14}/>Filtrer les actions...</div>
        <button className="bg-blue-600 text-white text-xs px-4 rounded-xl font-semibold">Run</button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[{l:'P/E < 20',c:'blue'},{l:'Cap > 10Md',c:'green'},{l:'Marge > 15%',c:'purple'},{l:'Δ > +2%',c:'gold'}].map(f=>(
          <span key={f.l} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium',
            f.c==='blue'?'bg-blue-500/10 border-blue-500/20 text-blue-400':
            f.c==='green'?'bg-green-500/10 border-green-500/20 text-green-400':
            f.c==='purple'?'bg-purple-500/10 border-purple-500/20 text-purple-400':
            'bg-yellow-500/10 border-yellow-500/20 text-yellow-400')}>{f.l}</span>
        ))}
      </div>
      {[{s:'AAPL',n:'Apple',p:308.82,c:+1.26,cap:'3.28T',pe:28.4,sel:true},{s:'MSFT',n:'Microsoft',p:428.73,c:+0.87,cap:'3.19T',pe:35.1,sel:false},{s:'NVDA',n:'NVIDIA',p:127.85,c:+3.41,cap:'3.13T',pe:55.2,sel:false},{s:'GOOGL',n:'Alphabet',p:178.23,c:+0.54,cap:'2.19T',pe:22.3,sel:false}].map(r=>(
        <div key={r.s} className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl border',r.sel?'bg-blue-600/10 border-blue-600/20':'bg-zinc-900 border-white/[.04]')}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">{r.s[0]}</div>
            <div><p className="text-white text-xs font-semibold">{r.s}</p><p className="text-zinc-500 text-xs">{r.n}</p></div>
          </div>
          <div className="flex gap-4 text-xs text-zinc-400 hidden md:flex">
            <span>Cap <b className="text-white">{r.cap}</b></span><span>P/E <b className="text-white">{r.pe}</b></span>
          </div>
          <div className="text-right">
            <p className="text-white text-xs font-bold">${r.p}</p>
            <p className={cn('text-xs font-semibold',r.c>=0?'text-green-400':'text-red-400')}>{r.c>=0?'+':''}{r.c}%</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertMock() {
  return (
    <div className="bg-zinc-950 rounded-2xl border border-white/[.06] overflow-hidden shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold text-sm">Centre d'alertes</span>
        <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Actif</span>
      </div>
      {[
        {sym:'NVDA',msg:'Objectif $125 atteint',time:'2 min',type:'green',Icon:Target},
        {sym:'TSLA',msg:'Chute -3% en 1h',time:'15 min',type:'red',Icon:AlertTriangle},
        {sym:'AAPL',msg:'Résultats Q2 dans 48h',time:'1h',type:'blue',Icon:Calendar},
        {sym:'SPY', msg:'Volume +240% anormal',time:'2h',type:'gold',Icon:Activity},
      ].map((a)=>(
        <div key={a.sym} className={cn('flex items-start gap-3 p-3 rounded-xl border',
          a.type==='green'?'bg-green-500/5 border-green-500/15':
          a.type==='red'?'bg-red-500/5 border-red-500/15':
          a.type==='gold'?'bg-yellow-500/5 border-yellow-500/15':
          'bg-blue-500/5 border-blue-500/15')}>
          <a.Icon size={14} className={cn('mt-0.5 flex-shrink-0',
            a.type==='green'?'text-green-400':a.type==='red'?'text-red-400':a.type==='gold'?'text-yellow-400':'text-blue-400')}/>
          <div className="flex-1 min-w-0">
            <p className="text-xs"><span className="text-white font-bold">{a.sym}</span> <span className="text-zinc-400">{a.msg}</span></p>
            <p className="text-zinc-600 text-xs mt-0.5">Il y a {a.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarMock() {
  return (
    <div className="bg-zinc-950 rounded-2xl border border-white/[.06] overflow-hidden shadow-2xl p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm flex items-center gap-2"><Calendar size={14} className="text-purple-400"/>Résultats à venir</span>
        <div className="flex gap-1">{['À venir','Passés'].map((f,i)=><button key={f} className={cn('text-xs px-2.5 py-1 rounded-full',i===0?'bg-purple-600/20 text-purple-400 border border-purple-500/20':'text-zinc-600')}>{f}</button>)}</div>
      </div>
      {[
        {s:'AAPL',n:'Apple Inc.',d:'22 mai',est:2.18,act:2.36,up:true},
        {s:'MSFT',n:'Microsoft',d:'24 mai',est:3.10,act:3.26,up:true},
        {s:'NVDA',n:'NVIDIA Corp.',d:'28 mai',est:0.68,act:null,up:null},
        {s:'GOOGL',n:'Alphabet',d:'31 mai',est:2.03,act:null,up:null},
      ].map((e)=>(
        <div key={e.s} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3 py-2.5 border border-white/[.04]">
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold flex-shrink-0">{e.s[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">{e.s} <span className="text-zinc-500 font-normal">{e.n}</span></p>
            <p className="text-zinc-500 text-xs">Est. BPA <span className="text-white font-semibold">${e.est}</span></p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-zinc-400">{e.d}</p>
            {e.act===null?
              <span className="text-xs text-blue-400">À venir</span>:
              <span className={cn('text-xs font-bold',e.up?'text-green-400':'text-red-400')}>{e.up?'+':''}{(((e.act-e.est)/e.est)*100).toFixed(1)}%</span>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

const MOCKS: Record<string,React.ReactNode> = {
  portfolio:<PortfolioMock/>, screener:<ScreenerMock/>, alert:<AlertMock/>, calendar:<CalendarMock/>,
}

/* ─── Animation helpers ───────────────────────────────────── */
function FadeUp({ children, delay=0, className='' }: { children:React.ReactNode; delay?:number; className?:string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <motion.div ref={ref} initial={{opacity:0,y:28}} animate={inView?{opacity:1,y:0}:{}}
      transition={{duration:.6,delay,ease:[.22,1,.36,1]}} className={className}>
      {children}
    </motion.div>
  )
}

function SlideIn({ children, delay=0, from='left', className='' }: { children:React.ReactNode; delay?:number; from?:'left'|'right'; className?:string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-60px' })
  return (
    <motion.div ref={ref}
      initial={{opacity:0, x: from==='left'?-40:40}}
      animate={inView?{opacity:1,x:0}:{}}
      transition={{duration:.7,delay,ease:[.22,1,.36,1]}} className={className}>
      {children}
    </motion.div>
  )
}

/* ─── Ticker live ─────────────────────────────────────────── */
function useLiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([])

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

    const load = async () => {
      try {
        const res = await fetch(`${API}/market/public/ticker`, { cache: 'no-store' })
        if (!res.ok) throw new Error('fetch failed')
        const data: TickerItem[] = await res.json()
        if (Array.isArray(data) && data.length > 0) setTickers(data)
      } catch {
        // Silently fall back to static data on error
      }
    }

    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  return tickers
}

/* ─── Main ────────────────────────────────────────────────── */
export default function Landing() {
  const [scrollY, setScrollY] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const liveTickers = useLiveTicker()

  useEffect(()=>{ const h=()=>setScrollY(window.scrollY); window.addEventListener('scroll',h); return ()=>window.removeEventListener('scroll',h) },[])

  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start','end start'] })
  const heroOpacity  = useTransform(scrollYProgress, [0,1], [1, 0])
  const heroScale    = useTransform(scrollYProgress, [0,1], [1, 0.96])

  // Utilise les données live si disponibles, sinon fallback statique
  const displayTickers = liveTickers.length > 0
    ? liveTickers
    : TICKER_FALLBACK.map(t => ({ ...t, change: 0 }))

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Nav ────────────────────────────────────────────── */}
      <motion.nav
        className={cn('fixed top-0 w-full z-50 transition-colors duration-300',
          scrollY>20||mobileNavOpen?'bg-black/95 backdrop-blur-xl border-b border-white/[.05]':'bg-transparent')}
        initial={{y:-60,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:.5,ease:'easeOut'}}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">I</div>
              <span className="font-bold text-lg">InvestSaaS</span>
            </Link>
            <div className="hidden lg:flex items-center gap-0.5">
              {[
                {l:'Fonctionnalités', href:'#features'},
                {l:'Screener',        href:'#features'},
                {l:'Alertes',         href:'#features'},
                {l:'Tarifs',          href:'#pricing'},
                {l:'FAQ',             href:'#faq'},
              ].map(item => (
                <a key={item.l} href={item.href}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  {item.l}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">
              Connexion
            </Link>
            <button
              onClick={() => setMobileNavOpen(v => !v)}
              aria-label="Menu de navigation"
              aria-expanded={mobileNavOpen}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
            >
              {mobileNavOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
            <Link href="/register" className="bg-white text-black text-sm px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-100 transition-all shadow-lg shadow-white/10 hover:shadow-white/20">
              Commencer
            </Link>
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-white/[.05] px-5 py-3 space-y-1">
            {[
              {l:'Fonctionnalités', href:'#features'},
              {l:'Screener',        href:'#features'},
              {l:'Alertes',         href:'#features'},
              {l:'Tarifs',          href:'#pricing'},
              {l:'FAQ',             href:'#faq'},
            ].map(item => (
              <a key={item.l} href={item.href} onClick={() => setMobileNavOpen(false)}
                className="flex items-center h-11 px-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                {item.l}
              </a>
            ))}
            <div className="pt-2 border-t border-white/[.04]">
              <Link href="/login" onClick={() => setMobileNavOpen(false)}
                className="flex items-center h-11 px-3 text-sm text-zinc-400 hover:text-white rounded-lg transition-colors">
                Connexion
              </Link>
            </div>
          </div>
        )}
      </motion.nav>

      {/* ── Ticker live ────────────────────────────────────── */}
      <div className="pt-16 bg-zinc-950/50 border-b border-white/[.04] overflow-hidden">
        <div className="flex gap-10 whitespace-nowrap py-2.5 animate-ticker" style={{width:'max-content'}}>
          {[...displayTickers,...displayTickers].map((t,i)=>(
            <span key={i} className="flex items-center gap-2 text-xs">
              <span className="text-zinc-600 font-mono uppercase tracking-wide">{t.symbol}</span>
              <span className="text-white font-mono font-semibold tabular-nums">
                ${typeof t.price === 'number' ? t.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) : t.price}
              </span>
              <span className="font-mono font-bold tabular-nums"
                style={{color: (t.changePercent ?? 0) >= 0 ? '#26a69a' : '#ef5350'}}>
                {(t.changePercent ?? 0) >= 0 ? '+' : ''}{(t.changePercent ?? 0).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────── */}
      <motion.section ref={heroRef} style={{opacity:heroOpacity,scale:heroScale}}
        className="relative overflow-hidden pt-12 pb-10 px-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(34,197,94,0.07),transparent)] pointer-events-none"/>
        <div className="absolute top-20 left-1/3 w-96 h-96 bg-green-600/[.04] rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute top-20 right-1/3 w-96 h-96 bg-blue-600/[.04] rounded-full blur-3xl pointer-events-none"/>

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}}>
            <span className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-4 py-2 rounded-full">
              <Sparkles size={12}/> Données temps réel · 14 providers · Sans commission
            </span>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.65,delay:.1,ease:[.22,1,.36,1]}}
            className="mt-5 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.02] tracking-tight text-balance">
            Investissez avec la<br/>
            <span className="gradient-text-green">précision des pros.</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.2}}
            className="mt-5 text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Portfolio tracker temps réel, screener institutionnel, alertes intelligentes et calendrier des résultats.
            Marchés US, Europe, Canada et BRVM Afrique de l'Ouest.
          </motion.p>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.3}}
            className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="group inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl text-base font-bold hover:bg-zinc-100 transition-all shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5">
              Ouvrir un compte gratuit
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 border border-white/10 text-zinc-300 hover:text-white hover:border-white/25 px-8 py-4 rounded-2xl text-base font-medium transition-all">
              <Play size={14} className="text-zinc-500"/> Voir les fonctionnalités
            </a>
          </motion.div>
          <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.5}} className="mt-4 text-xs text-zinc-700">
            Sans carte bancaire · Trial 14 jours · Annulation à tout moment
          </motion.p>

          <motion.div initial={{opacity:0,y:40,scale:.96}} animate={{opacity:1,y:0,scale:1}}
            transition={{duration:.8,delay:.4,ease:[.22,1,.36,1]}}
            className="mt-10 relative max-w-5xl mx-auto">
            <div className="animate-float">
              <PortfolioMock/>
            </div>
            <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.9}}
              className="absolute -left-8 top-1/3 hidden xl:block bg-zinc-900 border border-white/[.06] rounded-2xl p-4 shadow-2xl w-52">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500/15 rounded-xl flex items-center justify-center"><Target size={14} className="text-green-400"/></div>
                <div><p className="text-white text-xs font-bold">Alerte déclenchée</p><p className="text-zinc-500 text-xs">Il y a 2 min</p></div>
              </div>
              <p className="text-xs text-zinc-400"><span className="text-white font-bold">NVDA</span> a atteint <span className="text-green-400 font-bold">$125</span></p>
            </motion.div>
            <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:1.1}}
              className="absolute -right-8 top-1/4 hidden xl:block bg-zinc-900 border border-white/[.06] rounded-2xl p-4 shadow-2xl w-48">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">AAPL Q2</p>
              <div className="space-y-1.5">
                {[['BPA réel','$2.36','text-green-400'],['Surprise','+8.2%','text-green-400'],['Revenus','$94.4Md','text-white']].map(([l,v,c])=>(
                  <div key={l} className="flex justify-between text-xs"><span className="text-zinc-400">{l}</span><span className={cn('font-bold',c)}>{v}</span></div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <section className="border-y border-white/[.04] bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-5 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s,i)=>(
              <FadeUp key={s.l} delay={i*.1}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 text-zinc-500 mb-3">{s.icon}</div>
                  <p className="text-3xl md:text-4xl font-black gradient-text-green tabular-nums">{s.n}</p>
                  <p className="text-zinc-500 text-sm mt-1">{s.l}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature sections ───────────────────────────────── */}
      <div id="features" className="space-y-0">
        {SECTIONS.map((sec,i)=>{
          const a = ACCENT[sec.accent]
          return (
            <section key={sec.badge} className={cn('py-24 px-5',i%2===1?'bg-zinc-950/30 border-y border-white/[.03]':'')}>
              <div className="max-w-7xl mx-auto">
                <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',sec.reverse&&'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1')}>
                  <SlideIn from={sec.reverse?'right':'left'}>
                    <span className={cn('inline-flex items-center gap-1.5 border text-xs font-semibold px-3 py-1 rounded-full',a.bg,a.border,a.text)}>
                      {sec.icon} {sec.badge}
                    </span>
                    <h2 className="mt-5 text-4xl md:text-5xl font-black leading-[1.08] text-balance">
                      {sec.title[0]}<br/>
                      <span className={a.text}>{sec.title[1]}</span>
                    </h2>
                    <p className="mt-4 text-zinc-400 text-lg leading-relaxed">{sec.desc}</p>
                    <ul className="mt-6 space-y-3">
                      {sec.features.map(f=>(
                        <motion.li key={f} className="flex items-center gap-3 text-zinc-300 text-sm"
                          initial={{opacity:0,x:-10}} whileInView={{opacity:1,x:0}}
                          viewport={{once:true}} transition={{duration:.4}}>
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs',a.bg,a.text)}>
                            <Check size={11} strokeWidth={3}/>
                          </span>
                          {f}
                        </motion.li>
                      ))}
                    </ul>
                    <div className="mt-8 flex gap-3">
                      <Link href="/register" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-all">
                        Essayer gratuitement <ArrowRight size={14}/>
                      </Link>
                    </div>
                  </SlideIn>
                  <SlideIn from={sec.reverse?'left':'right'} delay={0.1}>
                    <motion.div whileHover={{y:-4,transition:{duration:.3}}} className="cursor-default">
                      {MOCKS[sec.mockup]}
                    </motion.div>
                  </SlideIn>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 border-t border-white/[.04]">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Tarifs</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Simple, transparent,<br/><span className="gradient-text-green">sans surprise.</span>
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Commencez gratuitement. Évoluez quand vous êtes prêt. Annulez à tout moment.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.key} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: .25 } }}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-6 h-full transition-colors cursor-default',
                    plan.key === 'PRO'
                      ? 'bg-zinc-900 border-green-500/30 shadow-xl shadow-green-500/5'
                      : 'bg-zinc-950 border-white/[.06] hover:border-white/10'
                  )}
                >
                  {/* Badge populaire */}
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-green-500 text-black whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-white/5', plan.color)}>
                      {plan.icon}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{plan.name}</p>
                      <p className="text-zinc-500 text-xs">
                        {plan.price === '0' ? 'Gratuit' : `$${plan.price}/mois`}
                      </p>
                    </div>
                  </div>

                  {/* Prix affiché */}
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white tabular-nums">
                      {plan.price === '0' ? '0' : `$${plan.price}`}
                    </span>
                    {plan.price !== '0' && <span className="text-zinc-500 text-sm ml-1">/mois</span>}
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-300">
                        <Check size={12} className={cn('mt-0.5 flex-shrink-0', plan.color)} strokeWidth={2.5}/>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/register"
                    className={cn(
                      'w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all',
                      plan.key === 'PRO'
                        ? 'bg-green-500 text-black hover:bg-green-400'
                        : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {plan.key === 'FREE' ? 'Commencer gratuitement' : `Essayer ${plan.name}`}
                  </Link>
                </motion.div>
              </FadeUp>
            ))}
          </div>

          <p className="text-center text-zinc-700 text-xs mt-8">
            Prix en USD · Facturation mensuelle · 14 jours d'essai gratuit sur tous les plans payants
          </p>
        </div>
      </section>

      {/* ── Protection ─────────────────────────────────────── */}
      <section className="py-20 px-5 border-y border-white/[.04] bg-zinc-950/30">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Garantie de protection InvestSaaS</h2>
            <p className="text-zinc-400 max-w-lg mx-auto">Votre sécurité est notre priorité absolue.</p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROTECTION.map((p,i)=>(
              <FadeUp key={p.title} delay={i*.08}>
                <motion.div whileHover={{y:-4,borderColor:'rgba(255,255,255,0.1)'}}
                  className="bg-zinc-950 border border-white/[.05] rounded-2xl p-6 text-center transition-colors cursor-default">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 mx-auto mb-4">{p.icon}</div>
                  <h3 className="font-bold text-white mb-2 text-sm">{p.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{p.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Témoignages</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Ce que nos utilisateurs en pensent</h2>
            <div className="flex items-center justify-center gap-0.5">
              {[...Array(5)].map((_,i)=><Star key={i} size={18} className="text-yellow-400 fill-yellow-400"/>)}
              <span className="text-zinc-500 text-sm ml-2">4.9 / 5</span>
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {name:'Marie D.',role:'Investisseur particulier',av:'MD',col:'from-blue-600 to-blue-800',
                text:"Les alertes m'ont permis de suivre mes positions sans rester rivée à l'écran. Le screener BRVM est particulièrement bien pensé."},
              {name:'Thomas L.',role:'Gérant de patrimoine',av:'TL',col:'from-purple-600 to-purple-800',
                text:"Nous suivons nos clients depuis une seule interface. Le plan Advisor avec les portefeuilles clients est exactement ce dont nous avions besoin."},
              {name:'Sophie R.',role:'Trader indépendant',av:'SR',col:'from-green-600 to-green-800',
                text:"Données temps réel + screener fondamental en un outil. L'accès API sur le plan Pro m'a permis d'automatiser mes stratégies."},
            ].map((t,i)=>(
              <FadeUp key={t.name} delay={i*.1}>
                <motion.div whileHover={{y:-4}} className="bg-zinc-950 border border-white/[.05] rounded-2xl p-6 cursor-default transition-colors hover:border-white/10">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_,j)=><Star key={j} size={13} className="text-yellow-400 fill-yellow-400"/>)}
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',t.col)}>{t.av}</div>
                    <div><p className="font-semibold text-sm">{t.name}</p><p className="text-zinc-600 text-xs">{t.role}</p></div>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-5 border-t border-white/[.04] bg-zinc-950/20">
        <div className="max-w-3xl mx-auto">
          <FadeUp className="text-center mb-10">
            <h2 className="text-3xl font-black mb-2">Questions fréquentes</h2>
          </FadeUp>
          <div className="space-y-2">
            {[
              {q:"Est-ce vraiment gratuit pour commencer ?",
               a:"Oui. Le plan gratuit ne nécessite aucune carte bancaire : 1 portefeuille, 5 alertes actives, 10 titres en watchlist, accès BRVM temps réel et 1 an d'historique."},
              {q:"Les données sont-elles en temps réel ?",
               a:"Oui, sur tous les plans via notre infrastructure de 14 providers (Finnhub, Twelve Data, Polygon, EODHD et plus). Les données BRVM sont rafraîchies toutes les 15 minutes en séance."},
              {q:"Puis-je annuler mon abonnement ?",
               a:"Absolument. Pas d'engagement, pas de frais. Annulez depuis votre espace Billing en un clic — votre accès reste actif jusqu'à la fin de la période payée."},
              {q:"Vos données sont-elles sécurisées ?",
               a:"Chiffrement AES-256, hébergement sécurisé (Railway + Vercel), nous n'accédons jamais à vos comptes courtiers réels. Nous ne stockons aucune donnée bancaire."},
              {q:"Y a-t-il une API disponible ?",
               a:"Oui, à partir du plan Pro. API REST complète + WebSocket pour les alertes en temps réel. Documentation disponible après inscription."},
              {q:"Quels marchés sont couverts ?",
               a:"Marchés US (NYSE, NASDAQ), Europe (Euronext, Frankfurt, LSE), Canada (TSX) et BRVM (Bourse Régionale des Valeurs Mobilières, Afrique de l'Ouest)."},
            ].map((f,i)=>(
              <FadeUp key={i} delay={i*.06}>
                <details className="bg-zinc-950 border border-white/[.05] rounded-2xl group hover:border-white/10 transition-colors">
                  <summary className="px-6 py-4 font-semibold text-sm flex items-center justify-between text-zinc-200 hover:text-white cursor-pointer">
                    {f.q}
                    <ChevronDown size={16} className="text-zinc-600 group-open:rotate-180 transition-transform flex-shrink-0 ml-4"/>
                  </summary>
                  <p className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-white/[.04] pt-3">{f.a}</p>
                </details>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <FadeUp>
            <div className="relative bg-zinc-950 border border-white/[.06] rounded-4xl p-12 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(34,197,94,0.06),transparent)] pointer-events-none"/>
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                14 jours d'essai gratuit · Sans carte bancaire
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
                Rejoignez la nouvelle<br/>
                <span className="gradient-text-green">génération d'investisseurs.</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
                Ouvrez votre compte en 2 minutes. Aucune carte bancaire requise.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register" className="group inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-2xl text-base font-black hover:bg-zinc-100 transition-all shadow-2xl shadow-white/10">
                  Ouvrir un compte gratuit <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 px-10 py-4 rounded-2xl text-base font-medium transition-all">
                  Déjà un compte ?
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/[.04] py-16 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center font-black text-black text-sm">I</div>
                <span className="font-bold">InvestSaaS</span>
              </div>
              <p className="text-zinc-600 text-xs leading-relaxed mb-4">La plateforme d'investissement nouvelle génération. Données temps réel, 14 providers, alertes instantanées. US · Europe · Canada · BRVM.</p>
              <div className="flex gap-2">
                {['𝕏','in','▶'].map(s=><a key={s} href="#" className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-500 hover:text-white transition-colors">{s}</a>)}
              </div>
            </div>
            {[
              {title:'Produit',    links:['Portfolio','Screener','Alertes','Calendrier','Watchlist','Terminal action']},
              {title:'Abonnement',links:['Plan Gratuit','Starter — $9/mois','Pro — $29/mois','Advisor — $79/mois','API']},
              {title:'Ressources',links:['Documentation','Blog','Guides','Statut API','Changelog']},
              {title:'Légal',     links:['CGU','Confidentialité','RGPD','Risques','Mentions légales']},
            ].map(col=>(
              <div key={col.title}>
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">{col.title}</p>
                <ul className="space-y-2">{col.links.map(l=><li key={l}><a href="#" className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors">{l}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-700 text-xs">© 2026 InvestSaaS · Paris, France</p>
            <p className="text-zinc-800 text-xs max-w-xl text-center md:text-right leading-relaxed">
              Investir comporte des risques de perte en capital. Les performances passées ne préjugent pas des performances futures. InvestSaaS ne fournit pas de conseil en investissement.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
