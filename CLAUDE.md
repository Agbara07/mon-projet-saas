# CLAUDE.md — InvestSaaS

Plateforme SaaS d'investissement boursier couvrant les marchés mondiaux (US, Europe, Canada, BRVM/Afrique de l'Ouest).

## Stack

| Couche          | Technologie                                               |
|-----------------|-----------------------------------------------------------|
| Frontend        | Next.js 14 (App Router), TypeScript, Tailwind CSS         |
| Backend         | Node.js + Express, TypeScript                             |
| Base de données | PostgreSQL + Prisma ORM                                   |
| Auth            | JWT (access 15min + refresh 7j), bcryptjs                 |
| Temps réel      | WebSocket (ws), alertes via node-cron                     |
| Charts          | Recharts (dashboard), lightweight-charts v5 (TradingView) |
| Deploy          | Vercel (frontend), Railway (backend + PostgreSQL)         |

## Structure du projet

```
mon-projet-saas/
├── .claude/
│   └── commands/              # Skills Claude Code projet (8 commandes slash)
│       ├── audit-securite.md
│       ├── analyse-architecture-360.md
│       ├── clarifier-besoin.md
│       ├── deployer-prod.md
│       ├── planifier-architecture.md
│       ├── tester-et-deboguer.md
│       ├── verifier-sante.md
│       └── concepteur-ui-ux.md
│
├── frontend/                  # Next.js 14 (App Router)
│   ├── .env.local             # Variables locales (gitignored)
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
│       ├── services/alert.service.ts       # Engine d'alertes WebSocket (node-cron)
│       ├── services/brvm-cron.service.ts   # Cron BRVM (node-cron, 15min séance / 1h hors séance)
│       ├── controllers/market.controller.ts
│       └── routes/market.routes.ts
│
├── backend/prisma/schema.prisma
├── .env                       # Clés API (ne pas committer les vraies clés)
├── docker-compose.yml         # PostgreSQL local sur port 5434
└── railway.json               # Config Railway (startCommand avec migrate)
```

## Skills Claude Code (`.claude/commands/`)

Commandes slash disponibles dans ce projet — invoquer avec `/nom` dans Claude Code :

| Commande                    | Rôle                                                        |
|-----------------------------|-------------------------------------------------------------|
| `/audit-securite`           | Audit sécurité (OWASP, secrets, injections, auth)           |
| `/analyse-architecture-360` | Audit architectural complet + score de santé                |
| `/clarifier-besoin`         | Clarifie les ambiguïtés avant de coder                      |
| `/deployer-prod`            | Checklist + déploiement sécurisé (Vercel + Railway)         |
| `/planifier-architecture`   | Plan d'implémentation avant d'écrire le code                |
| `/tester-et-deboguer`       | Debugging, cause racine, test de non-régression             |
| `/verifier-sante`           | Vérifie que l'environnement local est 100% opérationnel     |
| `/concepteur-ui-ux`         | Interfaces modernes, accessibles, performantes (Tailwind)   |
| `/analyst-wallstreet`       | Analyse financière, pricing, API data, arbitrage coût/perf  |
| `/expert-brvm`              | Marché BRVM/UEMOA, données africaines, modélisation FCFA    |

## Règles de déclenchement automatique des skills

**IMPORTANT — Claude doit invoquer ces skills sans attendre que l'utilisateur tape la commande :**

| Si l'utilisateur parle de…                                          | Déclencher                  |
|----------------------------------------------------------------------|-----------------------------|
| Déployer, mettre en prod, pousser sur Vercel/Railway                | `/deployer-prod`            |
| Pricing, business model, API financière, coût/perf, EBITDA, LTV    | `/analyst-wallstreet`       |
| BRVM, UEMOA, Abidjan, marché africain, FCFA, SikaFinance            | `/expert-brvm`              |
| Bug inexplicable, test en échec, régressions                        | `/tester-et-deboguer`       |
| Nouvelle feature à coder (avant d'écrire le code)                  | `/planifier-architecture`   |
| Problème de sécurité, secrets, injections, auth                     | `/audit-securite`           |
| "Est-ce que tout marche ?", environnement local                     | `/verifier-sante`           |
| Nouvelle page, composant UI, design                                 | `/concepteur-ui-ux`         |
| Ambiguïté dans une demande, besoin flou                             | `/clarifier-besoin`         |

## Providers de données de marché (12 au total)

| #  | Nom            | Priorité | Spécialité                           | Clé env                  |
|----|----------------|----------|--------------------------------------|--------------------------|
| 1  | Finnhub        | 1        | Quotes, news, profils — 60 req/min   | `FINNHUB_API_KEY`        |
| 2  | Twelve Data    | 2        | Historique, indicateurs techniques   | `TWELVE_DATA_API_KEY`    |
| 3  | Polygon        | 3        | US equities, options                 | `POLYGON_API_KEY`        |
| 4  | EODHD          | 4        | EOD global, actions de sociétés      | `EODHD_API_KEY`          |
| 5  | Alpha Vantage  | 5        | 25 req/jour — dernier recours        | `ALPHA_VANTAGE_API_KEY`  |
| 6  | Marketstack    | 6        | Historique global                    | `MARKETSTACK_API_KEY`    |
| 7  | MarketData.app | 7        | Stocks/options US                    | `MARKETDATA_API_KEY`     |
| 8  | IEX Cloud      | 8        | Référence équités US, batch quotes   | `IEX_CLOUD_API_KEY`      |
| 9  | Benzinga       | 9        | Spécialiste news + analyst ratings   | `BENZINGA_API_KEY`       |
| 10 | TMX Group      | 10       | Bourse TSX (Canada), événements      | `TMX_API_KEY`            |
| 11 | ETF Global     | 11       | ETF holdings, secteurs, performance  | `ETF_GLOBAL_API_KEY`     |
| 12 | BRVM           | 12       | Marché UEMOA (Afrique de l'Ouest)    | aucune (données pub.)    |

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

### Yahoo Finance (supprimé — 21/05/2026)
Le package `yahoo-finance2` a été **désinstallé** (`npm uninstall yahoo-finance2`, 20 packages retirés).
Était cassé en production (Railway) à cause d'un redirect Yahoo (`/quote/AAPL` → `/quote/AAPL/`).
Ne pas réinstaller — utiliser les 12 providers à la place.
En dev, fetch direct sur l'API v8 si besoin ponctuel :
```
https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=1d&range=1mo
```

### node-cron — migration 3.x → 4.x (✅ CORRIGÉ le 21/05/2026)
`node-cron@4.2.1` installé — CVE GHSA-w5hq-g745-h8pq corrigée, `0 vulnerabilities`.
- `@types/node-cron` supprimé (types bundlés en v4)
- API compatible : `import cron from 'node-cron'` + `cron.schedule()` inchangés
- Node.js v22 en local ✅ — vérifier Railway si redéploiement nécessaire

### Railway — buildCommand
Ne jamais définir un `buildCommand` custom dans `railway.json` ou via l'API Railway.
Railpack auto-détecte Node.js + TypeScript et compile correctement.
Un `buildCommand` custom override railpack et casse le build.

### Railway — `railway up`
Lancer `railway up` depuis la **racine du projet** (`mon-projet-saas/`), pas depuis `backend/`.
Railway utilise `rootDirectory: backend` configuré dans le service — le CLI doit être à la racine.

### Portfolio — chargement
`loadPortfolio` et `loadHistory` sont deux fonctions async séparées dans `portfolio/page.tsx`.
`loadHistory` a son propre try/catch pour ne pas bloquer le portfolio en cas d'erreur réseau.

## Déploiement

### Railway (backend)
- Push sur `master` → Railway auto-deploy via GitHub integration
- `startCommand` dans `railway.json` : `npx prisma migrate deploy && node dist/index.js`
- Ne jamais définir un `buildCommand` custom — laisser railpack auto-détecter TypeScript
- Variables d'env à configurer dans Railway Dashboard (copier depuis `.env`)

### Vercel (frontend)
- Push sur `master` → Vercel auto-deploy
- Root directory : `frontend/`
- Variables d'env locales : `frontend/.env.local` (créé le 21/05/2026, dans `.gitignore`)
- Variables d'env production à configurer dans le dashboard Vercel :
  `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Base de données locale

```bash
docker-compose up -d          # PostgreSQL sur port 5434 (credentials: user/password)
cd backend
npx prisma migrate dev        # créer/appliquer migrations
npx prisma studio             # interface graphique
```

> `DATABASE_URL="postgresql://user:password@localhost:5434/mon_saas_db"` — les credentials
> `user`/`password` sont intentionnels, définis dans `docker-compose.yml`.

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

## Journal de session

<!-- Les entrées ci-dessous sont ajoutées automatiquement par Claude avant chaque compression de contexte -->

### Session du 21/05/2026 — 19:30
- Installé 8 skills dans `.claude/commands/` (`audit-securite`, `deployer-prod`, `verifier-sante`, etc.)
- Lancé `/verifier-sante` : builds ✅, TypeScript ✅, Prisma ✅, node_modules ✅
- Supprimé `yahoo-finance2` — 20 packages retirés (`npm uninstall yahoo-finance2`)
- Créé `frontend/.env.local` avec `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL`
- Mis à jour `frontend/.gitignore` — ajout de `.env.local`
- Documenté vulnérabilité `node-cron@3.0.3` → uuid CVE (GHSA-w5hq-g745-h8pq)
- Produit plan de migration `node-cron` 3.x → 4.x avec cartographie des fichiers impactés
- Configuré `PreCompact` hook dans `.claude/settings.json` pour auto-journal de session
- Mis à jour `CLAUDE.md` : structure complète, skills, workarounds, journal de session

## Travaux en cours / À faire

| Priorité | Tâche | Détail |
|----------|-------|--------|
| ✅ Fait | Migrer `node-cron` 3.x → 4.x | CVE GHSA-w5hq-g745-h8pq — corrigée le 21/05/2026 |
| ⚪ Optionnel | Ajouter clés API providers | `FINNHUB_API_KEY`, `TWELVE_DATA_API_KEY`, etc. dans `.env` |
