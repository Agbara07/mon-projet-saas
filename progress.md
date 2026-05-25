# Progress — InvestSaaS

Suivi de l'avancement du projet, mis à jour à chaque session de travail.

---

## État global : 🟢 Production opérationnelle

| Couche      | Statut | Notes |
|-------------|--------|-------|
| Backend     | ✅ Déployé | Railway — auto-deploy sur push `master` |
| Frontend    | ✅ Déployé | Vercel — auto-deploy sur push `master` |
| Base de données | ✅ En ligne | PostgreSQL Railway + migrations Prisma |
| Auth        | ✅ Fonctionnel | JWT access 15min + refresh 7j |
| WebSocket   | ✅ Fonctionnel | Alertes temps réel via node-cron |
| Freemium    | ✅ Fonctionnel | Plans FREE/STARTER/PRO/ADVISOR + trial 14j |

---

## Fonctionnalités complétées

### Infrastructure & Sécurité
- [x] helmet + rate limiting
- [x] Zod validation sur les routes auth
- [x] Index BDD (performance)
- [x] JWT interceptor auto-refresh (axios)
- [x] `node-cron` migré 3.x → 4.2.1 (CVE GHSA-w5hq-g745-h8pq corrigée)
- [x] `yahoo-finance2` supprimé (cassé en prod Railway)

### Providers de données marché (14 au total)
- [x] Finnhub, Twelve Data, Polygon, EODHD, Alpha Vantage
- [x] Marketstack, MarketData.app, IEX Cloud, Benzinga
- [x] TMX Group (Canada/TSX), ETF Global, BRVM (UEMOA)
- [x] FMP — fondamentaux 30 ans, DCF, bilans
- [x] FRED — macro US (Fed, CPI, chômage, PIB)
- [x] Circuit breaker (5 erreurs → ouverture, récup 2min)
- [x] Cache mémoire TTL (QUOTE=30s, HIST=5min, PROFILE=15min)

### Pages frontend
- [x] Dashboard principal
- [x] Portfolio (holdings + historique P&L)
- [x] Screener avec filtres enrichis
- [x] Watchlist
- [x] Alertes (WebSocket)
- [x] Calendrier économique
- [x] Dashboard macro (FRED)
- [x] Page BRVM/Afrique de l'Ouest
- [x] Billing / Plans tarifaires (Stripe Checkout)
- [x] Terminal View `/stock/[symbol]` (chart + onglets Vue d'ensemble / Fondamentaux / Technique / Actualités)

### Système freemium
- [x] `Plan` enum : FREE / STARTER / PRO / ADVISOR
- [x] Trial 14 jours (`trialEndsAt` sur `Organization`)
- [x] `planGuard` middleware sur portfolios, alertes, watchlist
- [x] `UpgradeModal` déclenchée par `plan:limit-reached`
- [x] Webhook Stripe → sync plan

### UI/UX
- [x] Sidebar — correction double-render (hidden lg:flex + mobile overlay)
- [x] Focus-visible unifié, taille texte, footer contextuel
- [x] TradingView chart (lightweight-charts v5, périodes 1J→5Y)
- [x] Framer Motion animations
- [x] Fond global `#f5f6fa`, sidebar blanche

### Tests
- [x] 24/24 tests frontend (portfolio, watchlist, calendar, settings, billing)

### Skills Claude Code
- [x] `audit-securite`, `deployer-prod`, `verifier-sante`, `clarifier-besoin`
- [x] `planifier-architecture`, `tester-et-deboguer`, `concepteur-ui-ux`
- [x] `analyst-wallstreet`, `expert-brvm`, `risk-bear-analyst`
- [x] `decision-engineer`, `financial-controller-quant`, `compliance-legal-officer`
- [x] `ui-ux-pro-max` — community skill dans `.claude/skills/` (161 règles, 67 styles, 161 palettes, scripts Python)

### Stack — Migrations
- [x] Next.js 14.2.35 → 15.5.18 + React 18 → 19 (0 changements de code — config `remotePatterns` seule)
- [x] 14 CVEs résolues par la migration Next.js
- [x] Engineering OS intégré dans CLAUDE.md (framework WHY/WHAT/HOW permanent)

### Outils d'analyse BRVM (7 providers dédiés — ✅ routés et déployés)
- [x] `brvm-liquidity` — score Amihud, `GET /brvm/tools/liquidity` + `GET /brvm/:symbol/liquidity`
- [x] `brvm-dividends` — screener dividendes + Gordon fair value
- [x] `brvm-commodities` — corrélation matières premières UEMOA
- [x] `brvm-africa` — comparateur bourses africaines
- [x] `brvm-macro` — tableau de bord macro UEMOA/BCEAO
- [x] `brvm-governance` — scores de gouvernance
- [x] `brvm-transaction-cost` — simulateur coûts barème CREPMF 2024
- [x] `brvm-tools.provider.ts` monolithe supprimé (918 lignes → 7 fichiers dédiés)
- [x] Committé (`ac015ce`) + déployé Railway ✅

---

## Backlog / À faire

| Priorité | Tâche | Détail |
|----------|-------|--------|
| 🔴 Haute | Configurer clés API manquantes | 10 clés vides : `FINNHUB_API_KEY`, `TWELVE_DATA_API_KEY`, etc. dans `.env` + Railway |
| 🟡 Moyenne | Tests backend | Coverage sur controllers + services market |
| 🟢 Basse | Notifications email | Alertes par email (SendGrid / Resend) |
| 🟢 Basse | Export portfolio | CSV / PDF des holdings et P&L |
| 🟢 Basse | Mobile responsive | Audit complet sur viewports < 768px |
| ⚪ Optionnel | Internationalisation | Anglais / Français switch |

---

## Journal des sessions

### Session du 24/05/2026 (session 2)
- Migration Next.js 14 → 15.5.18 + React 18 → 19 (0 erreur build, 14 CVEs résolues)
- Engineering OS intégré dans CLAUDE.md (framework WHY/WHAT/HOW)
- Installé skill `ui-ux-pro-max` (`.claude/skills/`) — Python 3.14 disponible, scripts opérationnels
- Split `brvm-tools.provider.ts` → 7 providers dédiés, routés, committés et déployés Railway
- `dontAsk` mode retiré de `.claude/settings.local.json`
- Création de `handoff.md` et `progress.md`

### Session du 24/05/2026 (session 1)
- Création de `progress.md` et `handoff.md`

### Session du 22/05/2026 — Autonome
- Migré `node-cron` 3.x → 4.2.1 (CVE corrigée)
- Ajouté système freemium + trial 14j
- Créé page `/billing`, `GET /billing/info`, webhook Stripe
- Ajouté `UpgradeModal` via `CustomEvent plan:limit-reached`
- Correction sidebar double-render + 6 problèmes UI
- 12 nouveaux tests dashboard (24/24 au total)
- Créé skills `analyst-wallstreet` et `expert-brvm`
- Déployé Railway + Vercel — production opérationnelle

### Session du 21/05/2026 — 19:30
- Installé 8 skills dans `.claude/commands/`
- Supprimé `yahoo-finance2` (20 packages retirés)
- Créé `frontend/.env.local`
- Documenté CVE `node-cron` → plan de migration produit
- Configuré hook `PreCompact` dans `.claude/settings.json`
