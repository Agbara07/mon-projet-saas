# CLAUDE.md — InvestSaaS

---

## Protocole Anti-Hallucination (PRIORITÉ ABSOLUE)

Ces règles s'appliquent AVANT l'Engineering OS. Elles existent pour éviter les boucles d'erreurs et la dégradation du contexte.

### Règles de session

- **1 session = 1 tâche.** Finir ou abandonner explicitement avant de passer à autre chose.
- **`/clear` entre chaque tâche distincte.** Ne jamais enchaîner feature + bug + refacto dans la même session.
- **Lire avant d'écrire.** Toujours lire les fichiers concernés avant tout edit — même si je "pense" connaître leur contenu.

### Ancres en début de session (responsabilité de l'utilisateur)

Si la session reprend après plusieurs échanges ou un `/clear`, l'utilisateur commence par :
```
Tâche : [description en 1 phrase]
Contrainte critique : [ce que Claude NE doit PAS faire]
```

### Signaux d'alerte → `/clear` immédiat

L'utilisateur doit taper `/clear` si Claude :
- Propose une solution déjà tentée et échouée dans la session
- Oublie une contrainte donnée moins de 10 messages avant
- Génère du code sans avoir lu les fichiers concernés
- Reformule le même raisonnement sans progresser

### Auto-vérification avant chaque réponse

Avant de répondre, Claude vérifie mentalement :
1. Ai-je lu les fichiers concernés ? (si non → lire d'abord)
2. Cette approche a-t-elle déjà échoué ? (si oui → stop, proposer autre chose)
3. Est-ce que je respecte les contraintes de cette session ? (si doute → relire le début du chat)

---

## Engineering Operating System

Règles opératoires permanentes — à appliquer avant chaque action.

### Framework de pensée (obligatoire)

Avant toute action, répondre :

1. **WHY** — Quel est le vrai objectif ? Est-ce réellement nécessaire ?
2. **WHAT** — Quel est le changement minimal correct ? Quels fichiers/modules sont impliqués ? Quelles contraintes ?
3. **HOW** — Quel est le chemin le plus efficace ? La solution la moins complexe ? Celle qui évite la dette technique ?

### Règles d'exécution

- **Think first, code second** — inspecter l'architecture, comprendre les patterns existants, identifier dépendances et risques avant tout edit
- **Pas d'edits aveugles** — toujours comprendre le contexte avant de modifier
- **Règle des 2 tentatives** — si 2 implémentations échouent : stop, réévaluer les hypothèses, identifier la cause racine, proposer une stratégie alternative. Ne jamais brute-forcer
- **Suivre les patterns existants** — ne pas introduire de nouveaux patterns, abstractions ou dépendances sans justification explicite

### Discipline token / efficacité

Ne pas :
- répéter le même raisonnement
- re-scanner des fichiers inchangés
- générer de larges outputs inutiles
- sur-expliquer des concepts simples
- boucler sur des approches déjà échouées

### Standards de code

- Production-ready : error handling, typé, pas de dead code, pas de duplication
- Commentaires expliquent le **POURQUOI**, pas le QUOI
- Avant édition : vérifier imports, types, build, effets de bord

### Priorités de décision

Quand plusieurs solutions existent : **correction → maintenabilité → simplicité → performance → vitesse**

### Gestion des échecs

Quand bloqué : **stop → résumer la compréhension → identifier les inconnues → proposer la prochaine meilleure action**. Pas d'expérimentation aléatoire.

### Checklist finale (avant de clore une tâche)

- [ ] Le problème est-il réellement résolu ?
- [ ] La solution est-elle minimale ?
- [ ] L'architecture est-elle cohérente ?
- [ ] Le code est-il maintenable ?
- [ ] La dette technique est-elle minimisée ?
- [ ] Les cas limites sont-ils gérés ?
- [ ] L'implémentation est-elle production-safe ?
- [ ] Un senior engineer approuverait-il ce PR ?

### Protocole de fermeture de session

1. Tests verts + builds propres (`npm run build` backend et frontend)
2. `handoff.md` mis à jour avec la session (fichiers modifiés, bugs corrigés, pièges)
3. Commit avec message structuré
4. **`git push origin master`** — Railway et Vercel déploient automatiquement depuis le remote

---

Plateforme SaaS d'investissement boursier couvrant les marchés mondiaux (US, Europe, Canada, BRVM/Afrique de l'Ouest).

## Stack

| Couche          | Technologie                                               |
|-----------------|-----------------------------------------------------------|
| Frontend        | Next.js 15 (App Router), TypeScript, Tailwind CSS, React 19 |
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
│   ├── commands/              # Skills Claude Code projet (16 commandes slash)
│   │   ├── audit-securite.md
│   │   ├── analyse-architecture-360.md
│   │   ├── clarifier-besoin.md
│   │   ├── deployer-prod.md
│   │   ├── planifier-architecture.md
│   │   ├── tester-et-deboguer.md
│   │   ├── verifier-sante.md
│   │   ├── concepteur-ui-ux.md
│   │   ├── analyst-wallstreet.md
│   │   ├── expert-brvm.md
│   │   ├── risk-bear-analyst.md
│   │   ├── decision-engineer.md
│   │   ├── financial-controller-quant.md
│   │   ├── seo-strategist.md
│   │   ├── seo-writer.md
│   │   └── compliance-legal-officer.md
│   └── skills/
│       └── ui-ux-pro-max/     # Community skill — 161 règles, 67 styles, 161 palettes
│           ├── SKILL.md
│           ├── data/          # 20 CSV (colors, styles, typography, charts, ux-guidelines…)
│           └── scripts/       # search.py, design_system.py (Python 3.14 requis)
│
├── frontend/                  # Next.js 15 (App Router)
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
| `/risk-bear-analyst`        | Red Team / Avocat du Diable — SPOF, stress test, pre-mortem |
| `/decision-engineer`        | Arbitre stratégique — tranche GO/NO-GO après débat          |
| `/financial-controller-quant` | Audit mathématique, RSI/MACD, intégrité données, comptabilité SYSCOHADA |
| `/compliance-legal-officer` | Droit FinTech, AMF-UMOA, RGPD, licences APIs, KYC/AML       |
| `/seo-strategist`           | SEO Phase 1 (stratégie keyword + roadmap) et Phase 2 (boucle hebdo Sonnet + MCP DataForSEO + GSC) |
| `/seo-writer`               | Rédacteur SEO pur — reçoit brief Phase 2 → livre article MDX complet (7 modules, 6 formules scoring, scaffold Next.js 15) |

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
| Risque d'infra, SPOF, panne, coût serveur, stress test              | `/risk-bear-analyst`        |
| Arbitrage GO/NO-GO, synthèse après débat analytique                 | `/decision-engineer`        |
| Formule mathématique, RSI/MACD, backtest, comptabilité SYSCOHADA    | `/financial-controller-quant` |
| Conformité, RGPD, AMF-UMOA, licence API, KYC, conseil illégal       | `/compliance-legal-officer` |
| SEO, mots-clés, contenu, article, ranking, Google, DataForSEO, GSC  | `/seo-strategist`           |
| Écrire un article SEO, brief Phase 2 prêt, MDX, blog Next.js        | `/seo-writer`               |

## Providers de données de marché (14 au total)

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
| 13 | FMP            | 13       | Fondamentaux 30 ans, DCF, bilans     | `FMP_API_KEY`            |
| 14 | FRED           | —        | Macro US : Fed, CPI, chômage, PIB    | `FRED_API_KEY` (gratuit) |

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
GET /brvm/:symbol/liquidity    → score liquidité Amihud
GET /brvm/:symbol/dividend     → dividendes + Gordon fair value
GET /brvm/:symbol/commodity    → corrélation matières premières

GET /brvm/tools/liquidity      → tous les scores liquidité
GET /brvm/tools/dividends      → screener dividendes BRVM
GET /brvm/tools/commodities    → corrélations matières premières
GET /brvm/tools/africa         → comparateur bourses africaines
GET /brvm/tools/macro          → tableau de bord macro UEMOA/BCEAO
GET /brvm/tools/governance     → scores de gouvernance
POST /brvm/tools/cost          → simulateur coûts (barème CREPMF 2024)

GET /macro/us                  → Fed, CPI, chômage, 10Y, PIB (FRED)
GET /macro/uemoa               → BCEAO, inflation UEMOA, PIB zone franc

GET /:symbol/quote
GET /:symbol/historical?period=1mo
GET /:symbol/profile
GET /:symbol/news
GET /:symbol/technical?period=3mo
GET /:symbol/ratings           → analyst ratings (Benzinga)
GET /:symbol/events            → événements corporate (TMX)
GET /:symbol/tsx               → cotation TSX en CAD

GET /:symbol/fundamentals      → bilans complets 10 ans + DCF (FMP)
GET /:symbol/dcf               → valorisation DCF + % upside (FMP)
GET /:symbol/income-statements → compte de résultats (FMP)
GET /:symbol/balance-sheets    → bilans (FMP)
GET /:symbol/cash-flows        → cash flows (FMP)
```

## Pages frontend (`/stock/[symbol]`) — Terminal View

Page de détail d'une action — accessible depuis screener, watchlist, liens `href="/stock/:symbol"`.

**Structure :**
- Status bar : breadcrumb Screener ← SYMBOL, boutons watchlist + alerte
- Header : prix, variation, volume, market cap, P/E, beta, range 52 semaines (barre de progression)
- Chart : lightweight-charts v5, périodes 1J/5J/1M/3M/1Y/5Y, sans SMA/EMA (dans l'onglet Technique)
- Onglets :
  - **Vue d'ensemble** : description, infos société, ratios, DCF FMP
  - **Fondamentaux** : income/balance/cashflow 5 ans (FMP) — sub-tabs
  - **Technique** : chart avec SMA/EMA/Bollinger + signaux calculés localement
  - **Actualités** : news Benzinga avec badge sentiment

**Fichiers :**
- `frontend/src/app/(dashboard)/stock/[symbol]/page.tsx` — page principale
- `frontend/src/app/(dashboard)/stock/[symbol]/components/StockChart.tsx`
- `frontend/src/app/(dashboard)/stock/[symbol]/components/OverviewTab.tsx`
- `frontend/src/app/(dashboard)/stock/[symbol]/components/FundamentalsTab.tsx`
- `frontend/src/app/(dashboard)/stock/[symbol]/components/NewsTab.tsx`
- `frontend/src/app/(dashboard)/stock/[symbol]/components/TechnicalTab.tsx`

**Note :** L'ancienne page `/app/stock/[symbol]/page.tsx` (hors dashboard, sans sidebar/auth) a été supprimée le 23/05/2026 — elle était en conflit de route.

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

### Session du 25/05/2026
- Responsive mobile complète sur 8 fichiers — commit `1ca934f`, déployé Vercel (push master)
  - `app/page.tsx` : hamburger `lg:hidden` + slide-down nav panel mobile
  - `portfolio/page.tsx` : KPI grid `grid-cols-2 sm:grid-cols-4`, chart grid `grid-cols-1 sm:grid-cols-3`
  - `screener/page.tsx` : presets `hidden sm:flex`, table `min-w-[680px]`, 52H/52L `hidden md:table-cell`
  - `stock/[symbol]/page.tsx` : tabs bar `overflow-x-auto` + `whitespace-nowrap flex-shrink-0`
  - `watchlist/page.tsx` : table `min-w-[560px]`, sparkline `hidden sm:table-cell`
  - `alerts/page.tsx` : table `min-w-[600px]`, date `hidden sm:table-cell`
  - `brvm/page.tsx` : status bar `overflow-x-auto` ; tables min-w (620–860px) ; KPI grids `grid-cols-2 sm:grid-cols-4` ; TH component + `className` prop ; colonnes Cap/Secteur/Pays `hidden sm:table-cell`
  - `calendar/page.tsx` : status bar `overflow-x-auto`, tables `min-w-[600px]`
- `handoff.md` mis à jour avec section responsive + patterns généraux

### Session du 24/05/2026
- Migration Next.js 14.2.35 → 15.5.18 + React 18 → 19 (0 changement de code, `remotePatterns` seule modif config, 14 CVEs résolues)
- Engineering OS intégré dans CLAUDE.md (framework WHY/WHAT/HOW permanent)
- Installé skill `ui-ux-pro-max` dans `.claude/skills/` — Python 3.14 disponible, scripts search.py opérationnels
- Split `brvm-tools.provider.ts` (918 lignes) → 7 providers dédiés, routés, committés (`ac015ce`), déployés Railway
- `dontAsk` mode retiré de `.claude/settings.local.json` → `defaultMode: default`
- Créé `progress.md` et `handoff.md` à la racine du projet

### Session du 22/05/2026 — Autonome
- Migré `node-cron` 3.x → 4.2.1 (CVE GHSA-w5hq-g745-h8pq corrigée)
- Ajouté système freemium + trial 14j : `Plan` enum (FREE/STARTER/PRO/ADVISOR), `trialEndsAt` sur `Organization`, migration Prisma
- Créé `plan-limits.ts`, `plan-guard.middleware.ts`, branché `planGuard` sur POST `/portfolios`, `/alerts`, `/watchlist`
- Créé page `/billing` complète (4 plans, trial banner, Stripe Checkout), `GET /billing/info`, webhook plan sync
- Ajouté `UpgradeModal` déclenchée par `CustomEvent plan:limit-reached` depuis axios interceptor
- Correction définitive sidebar double-render : `hidden lg:flex` desktop + `{mobileOpen && ...}` mobile overlay
- Ajouté `useCurrentUser` hook partagé, market hours dynamique, admin conditionnel par rôle
- Corrigé 6 problèmes UI audit : focus-visible unifié, taille texte, footer sidebar contextuel
- Ajouté 12 tests dashboard (portfolio, watchlist, calendar, settings, billing) — 24/24 frontend
- Créé skills `analyst-wallstreet` et `expert-brvm`
- Configuré `settings.local.json` permissions `dontAsk`
- Déployé Railway (push master) + Vercel (`vercel --prod`) — production opérationnelle

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
| ✅ Fait | Migrer Next.js 14 → 15 + React 19 | 0 changement de code — 14 CVEs résolues le 24/05/2026 |
| ✅ Fait | Router 7 providers BRVM | Committés + déployés Railway le 24/05/2026 |
| ✅ Fait | Responsive mobile toutes pages | 8 fichiers modifiés, build ✅, déployé Vercel le 25/05/2026 — commit `1ca934f` |
| 🔴 Prioritaire | Configurer clés API providers | 10 clés vides : `FINNHUB_API_KEY`, `TWELVE_DATA_API_KEY`, etc. dans `.env` + Railway |
