# Handoff — InvestSaaS

Document de passation. Tout ce qu'un développeur (ou une nouvelle session Claude) doit savoir pour reprendre le projet sans délai.

---

## Résumé exécutif

Plateforme SaaS d'investissement boursier couvrant les marchés mondiaux (US, Europe, Canada, BRVM/Afrique de l'Ouest). Production opérationnelle depuis le 22/05/2026.

- **Frontend** : Next.js 15 App Router + React 19 — Vercel
- **Backend** : Express + TypeScript — Railway
- **BDD** : PostgreSQL + Prisma — Railway
- **Auth** : JWT (access 15min + refresh 7j)
- **Données marché** : 14 providers, circuit breaker, cache TTL

---

## Accès et URLs

| Environnement | Service | URL |
|---------------|---------|-----|
| Production | Frontend | Vercel dashboard → `NEXT_PUBLIC_API_URL` |
| Production | Backend API | Railway dashboard → variable `RAILWAY_PUBLIC_DOMAIN` |
| Local | Frontend | `http://localhost:3000` |
| Local | Backend | `http://localhost:4000` |
| Local | PostgreSQL | `localhost:5434` (docker-compose) |
| Local | Prisma Studio | `http://localhost:5555` |

**Variables d'env critiques :**
```
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5434/mon_saas_db"
JWT_SECRET=...
JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
FINNHUB_API_KEY=...
TWELVE_DATA_API_KEY=...
# (voir CLAUDE.md §Providers pour la liste complète)

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

---

## Démarrage en dev (5 minutes)

```bash
# 1. Base de données
docker-compose up -d

# 2. Backend (Terminal 1)
cd backend
npm install
npx prisma migrate dev
npm run dev           # → port 4000

# 3. Frontend (Terminal 2)
cd frontend
npm install
npm run dev           # → port 3000
```

**Prérequis :** Node.js v22+, Docker Desktop actif.

---

## Architecture backend

### Structure des services market

```
backend/src/services/market/
├── market-router.ts        ← routing multi-provider + circuit breaker
├── cache.ts                ← cache mémoire TTL (Map)
├── circuit-breaker.ts      ← s'ouvre après 5 erreurs, récup 2min
├── types.ts                ← IMarketProvider, Quote, HistoricalPoint…
└── providers/              ← 21 fichiers (14 actifs + 7 nouveaux BRVM)
```

### Providers actifs dans `market-router.ts` (14)

| Priorité | Provider | Fichier | Spécialité |
|----------|----------|---------|-----------|
| 1 | Finnhub | `finnhub.provider.ts` | Quotes, news, profils |
| 2 | Twelve Data | `twelvedata.provider.ts` | Historique, indicateurs |
| 3 | Polygon | `polygon.provider.ts` | US equities, options |
| 4 | EODHD | `eodhd.provider.ts` | EOD global |
| 5 | Alpha Vantage | `alpha-vantage.provider.ts` | 25 req/jour — dernier recours |
| 6 | Marketstack | `marketstack.provider.ts` | Historique global |
| 7 | MarketData.app | `marketdata.provider.ts` | Stocks/options US |
| 8 | IEX Cloud | `iex.provider.ts` | Équités US batch |
| 9 | Benzinga | `benzinga.provider.ts` | News + analyst ratings |
| 10 | TMX Group | `tmx.provider.ts` | TSX Canada |
| 11 | ETF Global | `etf-global.provider.ts` | ETF holdings/secteurs |
| 12 | BRVM | `brvm.provider.ts` | UEMOA (données pub.) |
| 13 | FMP | `fmp.provider.ts` | Fondamentaux 30 ans, DCF |
| — | FRED | `fred.provider.ts` | Macro US (Fed, CPI, PIB) |

### Outils d'analyse BRVM (7 providers dédiés — routés ✅)

Providers déployés en production — accessibles via `GET/POST /api/market/brvm/tools/*` :

| Fichier | Route | Données |
|---------|-------|---------|
| `brvm-liquidity.provider.ts` | `GET /brvm/tools/liquidity` + `GET /brvm/:symbol/liquidity` | Score liquidité Amihud |
| `brvm-dividends.provider.ts` | `GET /brvm/tools/dividends` + `GET /brvm/:symbol/dividend` | Screener dividendes + Gordon |
| `brvm-commodities.provider.ts` | `GET /brvm/tools/commodities` + `GET /brvm/:symbol/commodity` | Corrélation matières premières |
| `brvm-africa.provider.ts` | `GET /brvm/tools/africa` | Comparateur bourses africaines |
| `brvm-macro.provider.ts` | `GET /brvm/tools/macro` | Tableau de bord macro UEMOA/BCEAO |
| `brvm-governance.provider.ts` | `GET /brvm/tools/governance` | Scores de gouvernance |
| `brvm-transaction-cost.provider.ts` | `POST /brvm/tools/cost` | Simulateur coûts (barème CREPMF 2024) |

### Routing par type de donnée

```typescript
quote:      ['finnhub','twelvedata','polygon','iex','eodhd','alphavantage','marketstack','marketdata']
historical: ['twelvedata','polygon','iex','eodhd','alphavantage','marketstack','finnhub']
news:       ['benzinga','polygon','finnhub','iex','alphavantage','eodhd']
technical:  ['twelvedata']  // indicateurs natifs gratuits
```

Les providers spécialisés (Benzinga, TMX, ETF Global, BRVM, FMP) sont appelés **directement** via des routes dédiées.

---

## Architecture frontend

### Pages (App Router — `src/app/(dashboard)/`)

| Route | Page | Auth |
|-------|------|------|
| `/dashboard` | Vue d'ensemble | ✅ |
| `/portfolio` | Holdings + P&L | ✅ |
| `/screener` | Screener filtres | ✅ |
| `/watchlist` | Watchlist | ✅ |
| `/alerts` | Alertes temps réel | ✅ |
| `/calendar` | Calendrier économique | ✅ |
| `/macro` | Dashboard macro FRED | ✅ |
| `/brvm` | Marché BRVM/UEMOA | ✅ |
| `/billing` | Plans + Stripe | ✅ |
| `/stock/[symbol]` | Terminal View action | ✅ |
| `/settings` | Paramètres compte | ✅ |

### Terminal View `/stock/[symbol]`

Page la plus complexe — 5 composants :

```
stock/[symbol]/
├── page.tsx                  ← orchestrateur + header prix
├── components/
│   ├── StockChart.tsx        ← lightweight-charts v5 (périodes 1J→5Y)
│   ├── OverviewTab.tsx       ← description + ratios + DCF FMP
│   ├── FundamentalsTab.tsx   ← income/balance/cashflow 5 ans (FMP)
│   ├── TechnicalTab.tsx      ← SMA/EMA/Bollinger + signaux locaux
│   └── NewsTab.tsx           ← Benzinga + badge sentiment
```

**Attention lightweight-charts v5 :** utiliser `chart.addSeries(AreaSeries, ...)`, pas l'ancien `addAreaSeries()`.

---

## Base de données — Modèles Prisma

```
Organization (plan, trialEndsAt)
  └── User (role: OWNER/ADMIN/MEMBER)
        ├── Portfolio
        │     ├── Holding
        │     │     └── Transaction
        │     └── HistoryPoint (P&L snapshots)
        ├── Alert (PRICE/PERCENT_CHANGE/VOLUME, ABOVE/BELOW)
        ├── WatchlistItem
        └── StockNote
  └── Subscription (Stripe: stripeCustomerId, stripeSubscriptionId)

BRVMCache (quotes JSON, source, itemCount)   ← alimenté par cron 15min
```

**Plans :** `FREE` / `STARTER` / `PRO` / `ADVISOR` / `ENTERPRISE`

**Migrations :** toujours lancer `npx prisma migrate dev` localement, Railway applique automatiquement au démarrage via `npx prisma migrate deploy`.

---

## Routes API — Résumé

```
POST   /api/auth/register, /login, /refresh, /logout

GET    /api/market/status
GET    /api/market/search?q=AAPL
GET    /api/market/screener
GET    /api/market/earnings
GET    /api/market/overview
GET    /api/market/:symbol/quote
GET    /api/market/:symbol/historical?period=1mo
GET    /api/market/:symbol/profile
GET    /api/market/:symbol/news
GET    /api/market/:symbol/technical?period=3mo
GET    /api/market/:symbol/ratings        ← Benzinga
GET    /api/market/:symbol/events         ← TMX
GET    /api/market/:symbol/tsx            ← TSX Canada CAD
GET    /api/market/:symbol/fundamentals   ← FMP
GET    /api/market/:symbol/dcf            ← FMP DCF
GET    /api/market/:symbol/income-statements
GET    /api/market/:symbol/balance-sheets
GET    /api/market/:symbol/cash-flows
GET    /api/market/etf/:symbol/...        ← ETF Global
GET    /api/market/brvm/...               ← BRVM UEMOA

GET/POST/DELETE /api/portfolios
GET/POST/DELETE /api/watchlist
GET/POST/DELETE /api/alerts
GET    /api/billing/info
POST   /api/billing/webhook               ← Stripe webhook
```

---

## Système freemium

| Plan | Portfolios | Alertes | Watchlist |
|------|-----------|---------|-----------|
| FREE | 1 | 3 | 10 |
| STARTER | 3 | 10 | 50 |
| PRO | 10 | 50 | 200 |
| ADVISOR | illimité | illimité | illimité |

**Middleware `planGuard`** branché sur :
- `POST /api/portfolios`
- `POST /api/alerts`
- `POST /api/watchlist`

**Flow UI :** dépassement → axios interceptor → `CustomEvent('plan:limit-reached')` → `UpgradeModal` s'ouvre.

**Trial :** 14 jours depuis `Organization.trialEndsAt`. Après expiration → plan FREE.

---

## Points d'attention / Pièges connus

### 1. `brvm-tools.provider.ts` supprimé
Fichier supprimé (918 lignes, dead code). Ne pas le restaurer. Les 7 nouveaux providers BRVM le remplacent.

### 2. `yahoo-finance2` supprimé définitivement
Cassé en prod Railway (redirect HTTPS). Ne pas réinstaller. Utiliser les 12+ providers à la place.

### 3. `node-cron` — version 4.x
`@types/node-cron` supprimé (types bundlés). L'API `cron.schedule()` est inchangée.

### 4. `railway.json` — ne pas toucher `buildCommand`
Railpack auto-détecte TypeScript. Un `buildCommand` custom override railpack et casse le build.

### 5. `railway up` — lancer depuis la racine
```bash
cd mon-projet-saas   # ← racine, pas backend/
railway up
```

### 6. lightweight-charts v5 — API breaking change
```typescript
// ✅ v5
chart.addSeries(AreaSeries, { ... })
// ❌ v4 (cassé)
chart.addAreaSeries({ ... })
```

### 7. Sidebar — double-render corrigé
Pattern définitif : `hidden lg:flex` pour desktop + `{mobileOpen && ...}` pour le mobile overlay. Ne pas modifier sans raison.

### 8. JWT payload — champ `userId`
Dans les middleware, utiliser `req.user?.userId` (pas `req.user?.id`). La payload JWT contient `userId`, pas `id`.

---

## Déploiement

### Railway (backend)
```bash
git push origin master   # auto-deploy via GitHub integration
# OU
railway up               # depuis la racine du projet
```

### Vercel (frontend)
```bash
git push origin master   # auto-deploy
# OU
vercel --prod            # depuis frontend/
```

**Checklist avant déploiement :**
- [ ] Build backend : `cd backend && npm run build` → 0 erreur TypeScript
- [ ] Build frontend : `cd frontend && npm run build` → 0 erreur
- [ ] Tests frontend : `cd frontend && npm test` → 24/24 ✅
- [ ] Variables d'env à jour dans Railway et Vercel dashboards
- [ ] Migrations Prisma cohérentes avec le schéma

---

## Skills Claude Code disponibles

Lancer avec `/nom-du-skill` dans Claude Code :

| Commande | Utilité |
|----------|---------|
| `/verifier-sante` | Vérifier que l'env local est opérationnel |
| `/audit-securite` | Audit OWASP, secrets, injections |
| `/deployer-prod` | Checklist + déploiement sécurisé |
| `/planifier-architecture` | Plan avant d'écrire du code |
| `/tester-et-deboguer` | Debugging + cause racine |
| `/expert-brvm` | Marché BRVM/UEMOA |
| `/analyst-wallstreet` | Pricing, API data, coût/perf |
| `/risk-bear-analyst` | Red Team, SPOF, stress test |
| `/decision-engineer` | Arbitrage GO/NO-GO |
| `/financial-controller-quant` | RSI/MACD, audit mathématique |
| `/compliance-legal-officer` | RGPD, AMF-UMOA, KYC |
| `/ui-ux-pro-max` | Design system (161 règles, 67 styles, 161 palettes) — `.claude/skills/` |

---

## Prochaines tâches prioritaires

1. **Configurer les clés API** manquantes dans Railway (voir tableau providers dans CLAUDE.md) — 10 clés vides
2. **Tests backend** — coverage sur controllers + services market
3. **Notifications email** — alertes par email (SendGrid ou Resend)
4. **Export portfolio** — CSV/PDF des holdings et P&L

---

*Dernière mise à jour : 24/05/2026 (session 2)*
