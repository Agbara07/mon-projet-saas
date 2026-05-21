# CLAUDE.md — InvestSaaS

Plateforme SaaS d'investissement boursier couvrant les marchés mondiaux (US, Europe, Canada, BRVM/Afrique de l'Ouest).

## Stack

| Couche       | Technologie                                                  |
|--------------|--------------------------------------------------------------|
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind CSS            |
| Backend      | Node.js + Express, TypeScript                                |
| Base de données | PostgreSQL + Prisma ORM                                   |
| Auth         | JWT (access 15min + refresh 7j), bcryptjs                    |
| Temps réel   | WebSocket (ws), alertes via node-cron                        |
| Charts       | Recharts (dashboard), lightweight-charts v5 (TradingView)    |
| Deploy       | Vercel (frontend), Railway (backend + PostgreSQL)            |

## Structure du projet

```
mon-projet-saas/
├── frontend/           # Next.js 14 (App Router)
│   └── src/
│       ├── app/(dashboard)/   # Pages protégées (layout avec sidebar)
│       │   ├── dashboard/
│       │   ├── portfolio/
│       │   ├── screener/
│       │   ├── watchlist/
│       │   ├── alerts/
│       │   ├── calendar/
│       │   ├── brvm/          # Marché BRVM / UEMOA
│       │   └── billing/
│       ├── components/
│       │   ├── layout/Sidebar.tsx
│       │   ├── charts/TradingChart.tsx   # lightweight-charts v5
│       │   └── ui/            # Card, Button, Badge, Input…
│       └── lib/
│           ├── api.ts         # axios instance avec JWT interceptor
│           └── utils.ts       # cn() helper
│
├── backend/
│   └── src/
│       ├── services/market/
│       │   ├── market-router.ts      # Routing multi-provider + circuit breaker
│       │   ├── cache.ts              # Cache mémoire TTL
│       │   ├── circuit-breaker.ts    # Ouverture sur 5 erreurs, récup 2min
│       │   ├── types.ts              # IMarketProvider, Quote, etc.
│       │   └── providers/            # 12 providers (voir tableau ci-dessous)
│       ├── controllers/market.controller.ts
│       ├── routes/market.routes.ts
│       └── services/alert.service.ts # Engine d'alertes WebSocket
│
├── backend/prisma/schema.prisma
├── .env                       # Clés API (ne pas committer les vraies clés)
├── docker-compose.yml         # PostgreSQL local sur port 5434
└── railway.json               # Config Railway (startCommand avec migrate)
```

## Providers de données de marché (12 au total)

| # | Nom            | Priorité | Spécialité                           | Clé env               |
|---|----------------|----------|--------------------------------------|-----------------------|
| 1 | Finnhub        | 1        | Quotes, news, profils — 60 req/min   | `FINNHUB_API_KEY`     |
| 2 | Twelve Data    | 2        | Historique, indicateurs techniques   | `TWELVE_DATA_API_KEY` |
| 3 | Polygon        | 3        | US equities, options                 | `POLYGON_API_KEY`     |
| 4 | EODHD          | 4        | EOD global, actions de sociétés      | `EODHD_API_KEY`       |
| 5 | Alpha Vantage  | 5        | 25 req/jour — dernier recours        | `ALPHA_VANTAGE_API_KEY` |
| 6 | Marketstack    | 6        | Historique global                    | `MARKETSTACK_API_KEY` |
| 7 | MarketData.app | 7        | Stocks/options US                    | `MARKETDATA_API_KEY`  |
| 8 | IEX Cloud      | 8        | Référence équités US, batch quotes   | `IEX_CLOUD_API_KEY`   |
| 9 | Benzinga       | 9        | Spécialiste news + analyst ratings   | `BENZINGA_API_KEY`    |
|10 | TMX Group      | 10       | Bourse TSX (Canada), événements      | `TMX_API_KEY`         |
|11 | ETF Global     | 11       | ETF holdings, secteurs, performance  | `ETF_GLOBAL_API_KEY`  |
|12 | BRVM           | 12       | Marché UEMOA (Afrique de l'Ouest)    | aucune (données pub.) |

**Routing par type de donnée** (défini dans `market-router.ts`) :
- `quote` → finnhub, twelvedata, polygon, iex, eodhd, alphavantage, marketstack, marketdata
- `historical` → twelvedata, polygon, iex, eodhd, alphavantage, marketstack, finnhub
- `news` → benzinga (prioritaire), polygon, finnhub, iex, alphavantage, eodhd
- `technical` → twelvedata uniquement (indicateurs natifs gratuits)

Les providers spécialisés (Benzinga, TMX, ETF Global, BRVM) sont appelés **directement** via des routes dédiées, pas via le routing générique.

## Routes API (`/api/market/...`)

```
GET /status                    → statut des providers + cache
GET /overview                  → top marchés
GET /search?q=...              → recherche de symboles
GET /screener                  → screener avec filtres
GET /earnings                  → calendrier résultats

GET /etf                       → ETFs par catégorie
GET /etf/:symbol               → détails ETF
GET /etf/:symbol/holdings      → top positions
GET /etf/:symbol/sectors       → exposition sectorielle
GET /etf/:symbol/performance   → performance multi-périodes

GET /brvm                      → toutes cotations BRVM
GET /brvm/indices              → BRVM Composite + BRVM 10
GET /brvm/sectors              → performance par secteur
GET /brvm/countries            → répartition 8 pays UEMOA
GET /brvm/market               → vue marché complète
GET /brvm/companies            → liste sociétés cotées
GET /brvm/:symbol/quote
GET /brvm/:symbol/historical

GET /:symbol/quote
GET /:symbol/historical?period=1mo
GET /:symbol/profile
GET /:symbol/news
GET /:symbol/technical?period=3mo
GET /:symbol/ratings           → analyst ratings (Benzinga)
GET /:symbol/events            → événements corporate (TMX)
GET /:symbol/tsx               → cotation TSX en CAD
```

## Conventions de code

### Backend
- TypeScript strict, pas de `any` sauf dans les parsers de réponses API externes
- Chaque provider implémente `IMarketProvider` (voir `types.ts`)
- Les providers spécialisés peuvent ajouter des méthodes supplémentaires
- TTL cache : QUOTE=30s, HISTORICAL=5min, PROFILE=15min, NEWS=5min
- Circuit breaker : s'ouvre après 5 erreurs consécutives, récupère après 2min
- `railway.json` contient le startCommand — ne pas supprimer `npx prisma migrate deploy`
- `tsconfig.json` backend : `"ignoreDeprecations": "5.0"` requis (moduleResolution node déprécié en TS5)
- Exclure `**/*.test.tsx` dans `tsconfig.json` sinon le build échoue

### Frontend
- Tailwind CSS — fond global `#f5f6fa` (bg-[#f5f6fa] ou bg-gray-50)
- Sidebar blanche (bg-white), état actif : `bg-blue-50 text-blue-700`
- lightweight-charts **v5** : utiliser `chart.addSeries(AreaSeries, ...)` — **pas** `addAreaSeries()`
- `api.ts` : instance axios avec base URL `NEXT_PUBLIC_API_URL`, interceptor JWT auto-refresh
- Animations : Framer Motion (`motion.div` avec `initial/animate`)

## Bugs et workarounds connus

### Yahoo Finance (abandonné)
Le package `yahoo-finance2` est cassé en production (Railway) à cause d'un redirect Yahoo (`/quote/AAPL` → `/quote/AAPL/`).
**Solution** : fetch direct sur l'API v8 sans authentification :
```
https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=1d&range=1mo
```
Ne pas réinstaller `yahoo-finance2` — utiliser les 12 providers à la place.

### Railway — buildCommand
Ne jamais définir un `buildCommand` custom dans `railway.json` ou via l'API Railway.
Railpack auto-détecte Node.js + TypeScript et compile correctement.
Un `buildCommand` custom override railpack et casse le build.

### Railway — `railway up`
Lancer `railway up` depuis la **racine du projet** (`mon-projet-saas/`), pas depuis `backend/`.
Railway utilise `rootDirectory: backend` configuré dans le service — le CLI doit être à la racine.

### Portfolio — chargement
`loadPortfolio` et `loadHistory` sont deux fonctions async séparées dans `portfolio/page.tsx`.
`loadHistory` a son propre try/catch pour ne pas bloquer le portfolio si Yahoo Finance timeout.

## Déploiement

### Railway (backend)
- Push sur `master` → Railway auto-deploy via GitHub integration
- `startCommand` dans `railway.json` : `npx prisma migrate deploy && node dist/index.js`
- Ne jamais définir un `buildCommand` custom — laisser railpack auto-détecter TypeScript
- Variables d'env à configurer dans Railway Dashboard (copier depuis `.env`)

### Vercel (frontend)
- Push sur `master` → Vercel auto-deploy
- Root directory : `frontend/`
- Variables d'env : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

## Base de données locale

```bash
docker-compose up -d          # PostgreSQL sur port 5434
cd backend
npx prisma migrate dev        # créer/appliquer migrations
npx prisma studio             # interface graphique
```

## Lancer en dev

```bash
# Terminal 1 — Backend
cd backend && npm run dev      # port 4000

# Terminal 2 — Frontend
cd frontend && npm run dev     # port 3000
```

## Modèles Prisma

`Organization` → `User` → `Portfolio` → `Holding` / `Transaction`
`User` → `Alert` / `WatchlistItem` / `StockNote`
`Organization` → `Subscription`
