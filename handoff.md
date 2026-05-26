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
| `/euronext` | Marchés européens (CAC40, indices, forex, dirigeants) | ✅ |
| `/billing` | Plans + Stripe | ✅ |
| `/stock/[symbol]` | Terminal View action | ✅ |
| `/settings` | Paramètres compte | ✅ |

**Toutes les pages sont mobile-responsive** (commit `1ca934f` — 25/05/2026) :

| Page | Pattern appliqué |
|------|-----------------|
| Landing | Hamburger `lg:hidden` + slide-down nav panel |
| Portfolio | KPI grid `grid-cols-2 sm:grid-cols-4`, chart grid `grid-cols-1 sm:grid-cols-3` |
| Screener | Preset buttons `hidden sm:flex`, table `min-w-[680px]`, colonnes 52H/52L `hidden md:table-cell` |
| Stock [symbol] | Tabs bar `overflow-x-auto` + `whitespace-nowrap flex-shrink-0` |
| Watchlist | Table `min-w-[560px]`, colonne sparkline `hidden sm:table-cell` |
| Alerts | Table `min-w-[600px]`, colonne date `hidden sm:table-cell` |
| BRVM | Status bar `overflow-x-auto` ; tables min-w (620–860px) ; KPI grids `grid-cols-2 sm:grid-cols-4` ; colonnes Cap/Secteur/Pays `hidden sm:table-cell` dans l'onglet Cotations |
| Calendar | Status bar `overflow-x-auto`, tables `min-w-[600px]` |
| Dashboard | Déjà responsive (indices `overflow-x-auto`, grids `lg:grid-cols-3`) |
| Macro | Déjà responsive (grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) |

Patterns généraux :
- Tables multi-colonnes → `overflow-auto` parent + `min-w-[Npx]` table (scroll horizontal natif)
- Colonnes non critiques → `hidden sm:table-cell` / `hidden md:table-cell`
- Grids denses → `grid-cols-1 sm:grid-cols-N` ou `grid-cols-2 sm:grid-cols-4`
- Barres d'état surchargées → `overflow-x-auto` + `flex-shrink-0` + `whitespace-nowrap`

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
BRVMPriceHistory (symbol, date, close, volume @@unique[symbol,date]) ← backfill + snapshot daily
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
GET    /api/market/euronext               ← overview (palmarès+indices+forex+commodités)
GET    /api/market/euronext/palmares      ← top5 gainers + top5 losers CAC40
GET    /api/market/euronext/stocks        ← 38/40 cotations CAC40 en EUR
GET    /api/market/euronext/indices       ← 7 indices européens (ETF proxies US)
GET    /api/market/euronext/forex         ← 5 paires EUR/* (BCE via open.er-api.com)
GET    /api/market/euronext/commodities   ← Or/Brent/Gaz/PDBC (ETF proxies US)
GET    /api/market/:symbol/insider        ← transactions dirigeants FMP (JWT requis)

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
| FREE | 1 | 5 | 10 |
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

### 9. Backend local — CRON_SECRET non chargé
`dotenv.config()` cherche `backend/.env` (inexistant). En dev local, démarrer ainsi :
```powershell
$env:CRON_SECRET = "BrvmCron2026InvestSaas"; npm run dev
```
Sur Railway, les env vars sont injectées directement — aucun `.env` nécessaire.

### 10. Euronext — sources de données et proxies

**Stocks CAC40 (`.PA`)** : Finnhub free tier retourne `c:0` pour Euronext Paris (exchange non couvert). La cascade TwelveData → EODHD prend le relais après le fix market-router (voir point 11).

**Indices européens** : pas d'API gratuite directe → ETF US-listés comme proxies :
`EWQ` (CAC40), `EWG` (DAX), `EWU` (FTSE100), `FEZ` (EuroStoxx50), `EWN` (AEX), `EWI` (MIB), `EWP` (IBEX35)

**Matières premières** : mêmes ETF proxies → `GLD` (Or), `BNO` (Brent), `UNG` (Gaz), `PDBC` (Matières 1ères)

**Forex EUR/\*** : `open.er-api.com` (données BCE, 1500 req/mois, sans clé, sans blocage Railway).
Frankfurter.app a des problèmes HTTPS redirect depuis Railway. Finnhub OANDA non couvert free tier.
⚠️ La variation journalière (change/changePercent) est à 0 sur le free tier — amélioration future.

**Insider transactions** : FMP `/stable/insider-trading?symbol=X&limit=N` — requiert JWT.

### 11. Fix systémique market-router — getQuotes() cascade (commit `adbb105`)

**Avant** : `withFallback()` s'arrêtait dès que Finnhub retournait `[]` (sans lever d'exception). TwelveData/EODHD ne prenaient jamais le relais pour les symboles `.PA`, `.DE`, `.SW`, etc.

**Après** : `getQuotes()` itère maintenant **tous** les providers jusqu'à ce que chaque symbole soit résolu. Chaque symbol non résolu passe au provider suivant de la liste `quote`.

Ce fix bénéficie au screener, aux pages stock et à toute utilisation de symboles européens — pas seulement à Euronext.

### 12. Page /euronext — 404 sur Vercel (✅ résolu — 26/05/2026)

**Cause racine :** le déploiement Vercel `nnat84g8g` avait échoué en 0ms (avant le build) — problème Vercel-side (quota/lock). Vercel avait rollback vers l'ancienne version sans euronext. Le code et le build local étaient corrects depuis le début.

**Fix :** `vercel --prod` depuis `frontend/` — déploiement `dpl_8FLhAururSVMCQW8rjXUCoCqSS4n` (Ready, aliasé sur `mon-projet-saas-nine.vercel.app`).

**Leçon :** si une page existe localement et build OK mais 404 sur Vercel → vérifier `vercel ls` et `vercel inspect` sur le déploiement Error avant de toucher au code.

### 14. Onglet Dirigeants — insider trading FMP non disponible sur plan gratuit (stand-by)

`FMP_API_KEY` configurée et fonctionnelle pour : profile, fundamentals, DCF, income/balance/cashflow.

Mais `/stable/insider-trading` retourne HTTP 404 — endpoint supprimé du plan gratuit FMP (migration août 2025).
`/api/v4/insider-trading` est legacy-only (abonnés avant août 2025 uniquement).

**Comportement actuel :** l'onglet Dirigeants affiche "Données indisponibles — vérifiez le symbole ou la clé FMP" — cohérent, pas de crash.

**À activer quand :** upgrade plan FMP payant → l'endpoint `/stable/insider-trading` sera débloqué, aucune modification de code nécessaire.

### 13. Backfill BRVM — SikaFinance URL correcte
URL historique : `/marches/historiques/{SYM}.{cc}` (pluriel, symbole majuscule, suffixe pays).
L'ancienne URL `/marches/historique/{sym}` retourne 404. Ne pas revenir en arrière.
Suffixes pays : `ci` Côte d'Ivoire, `sn` Sénégal, `bf` Burkina, `bj` Bénin, `tg` Togo, `ml` Mali, `ne` Niger, `gw` Guinée-Bissau.

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

## CI / Sécurité automatique

### Workflows GitHub Actions

| Fichier | Déclencheur | Rôle |
|---------|-------------|------|
| `brvm-refresh.yml` | Cron 15min (lun-ven 09h-15h30 UTC) | Rafraîchit les données BRVM |
| `security-review.yml` | Chaque PR + push `master` | Claude analyse les failles de sécurité |

### Security Review — configuration

- **Action** : `anthropics/claude-code-security-review@main`
- **Secret GitHub requis** : `CLAUDE_API_KEY` (clé API Anthropic — nom exact dans le workflow)
- **Paramètres actifs** : `comment-pr: true`, `upload-results: true`, `claudecode-timeout: 30`
- **Répertoires exclus** : `node_modules`, `dist`, `.next`

### Failles détectées automatiquement

Clés API hardcodées, credentials exposés, logs de données sensibles, injection SQL, routes sans auth, XSS, crypto faible.

### Testé le 25/05/2026

5 failles HIGH détectées et commentées sur la PR de test :
- Clé API hardcodée → `HIGH / hardcoded_secrets`
- Credentials DB exposés → `HIGH / hardcoded_secrets`
- Log mot de passe utilisateur → `HIGH / sensitive_data_exposure`
- Injection SQL → `HIGH / sql_injection`
- Route admin sans auth → `HIGH / broken_authorization`

---

## Conformité légale

### Pages légales (✅ déployées — commit `5432f2a`)

| Route | Fichier | Contenu |
|-------|---------|---------|
| `/cgu` | `frontend/src/app/cgu/page.tsx` | 13 articles — droit ivoirien, clause SGI, données BRVM non officielles |
| `/politique-confidentialite` | `frontend/src/app/politique-confidentialite/page.tsx` | 12 articles — Loi n°2013-450 + RGPD UE 2016/679, ARTCI, DPO |

### Composant Disclaimer (`frontend/src/components/ui/Disclaimer.tsx`)

3 variants disponibles :
- `banner` — intégré dans `(dashboard)/layout.tsx` → affiché sur **toutes** les pages authentifiées
- `inline` — à importer à la demande dans n'importe quelle page
- `brvm` — intégré dans `(dashboard)/brvm/page.tsx` → disclaimer données non officielles CREPMF

```tsx
<Disclaimer variant="banner" />
<Disclaimer variant="brvm" className="mx-3 mt-2" />
<Disclaimer variant="inline" dismissible />
```

### Cadre réglementaire appliqué

- **AMF-UMOA / CREPMF** : plateforme non agréée SGI — informations à titre éducatif uniquement
- **Données BRVM** : issues de SikaFinance (scraping sources publiques) — pas d'accord officiel CREPMF
- **Loi ivoirienne n°2013-450** : protection données personnelles — ARTCI comme autorité de contrôle
- **RGPD UE 2016/679** : applicable aux utilisateurs européens
- **Droit applicable** : droit ivoirien — juridiction : Tribunaux d'Abidjan
- **DPO** : privacy@investsaas.com
- **Société** : AGBARA CONSORTIUM SARL — RCCM CI-ABJ-03-2025-B13-01915

---

## Prochaines tâches prioritaires

1. **Clés API en stand-by** (services payants, à configurer à l'achat) : `MARKETDATA_API_KEY`, `IEX_CLOUD_API_KEY`, `TMX_API_KEY`, `ETF_GLOBAL_API_KEY`
2. **Onglet Dirigeants** — stand-by (voir point 14 des pièges connus)
3. **Stripe** — remplacer les placeholders Railway (`sk_test_placeholder`, `whsec_placeholder`) par les vraies clés Stripe
4. ✅ **Backfill Railway** — exécuté le 26/05/2026 — 29 symboles, 1 855 rows (voir Session 9)
5. **Tests backend** — coverage sur controllers + services market
6. **Notifications email** — alertes par email (SendGrid ou Resend)
7. **Export portfolio** — CSV/PDF des holdings et P&L

---

---

## Session 6 — 26/05/2026 — Feature Euronext

### Fichiers créés
- `backend/src/services/market/providers/euronext.provider.ts` — provider CAC40/indices/forex/commodités
- `backend/src/controllers/euronext.controller.ts` — handlers overview/palmarès/stocks/indices/forex/commodities/insider
- `frontend/src/app/(dashboard)/euronext/page.tsx` — page 5 onglets (Palmarès, Actions CAC40, Indices, Devises & Matières, Dirigeants)
- `frontend/src/app/(dashboard)/euronext/loading.tsx` — skeleton loading
- `frontend/src/app/(dashboard)/euronext/error.tsx` — error boundary avec retry

### Fichiers modifiés
- `backend/src/services/market/types.ts` — interface `InsiderTransaction` ajoutée
- `backend/src/services/market/providers/fmp.provider.ts` — `getInsiderTransactions()` ajouté
- `backend/src/services/market/market-router.ts` — **fix systémique** `getQuotes()` cascade (voir point 11)
- `backend/src/routes/market.routes.ts` — 6 routes `/euronext/*` publiques + `/:symbol/insider` (JWT)
- `frontend/src/components/layout/Sidebar.tsx` — entrée Euronext + icône `Euro` lucide-react
- `frontend/src/lib/api.ts` — TTL cache euronext (30s overview, 60s stocks, 120s autres)

### Commits
- `23195a3` — feat(euronext): backend marchés européens style ABCBourse
- `38f4e49` — feat(euronext): page /euronext avec 5 onglets
- `adbb105` — fix(market-router): cascade getQuotes() à travers tous les providers

### Backend testé ✅ (Railway)
Toutes les routes retournent des données réelles :
- Palmarès : Safran +5.79%, Hermès +2.83%, Schneider +3.07%
- Forex : EUR/USD=1.164, EUR/GBP=0.862, EUR/CHF=0.911

### Frontend ✅ — déployé sur Vercel (26/05/2026)
`https://mon-projet-saas-nine.vercel.app/euronext` opérationnel — déploiement `dpl_8FLhAururSVMCQW8rjXUCoCqSS4n`.

---

---

## Session 7 — 26/05/2026 — Clés API Railway + fix FRONTEND_URL

### Actions
- `FMP_API_KEY=zFnzyRPgrmHm4p3GRywmTyCB35NQY6XV` — ajoutée Railway + `.env` local
- `FRONTEND_URL` corrigé : `ton-app.vercel.app` → `mon-projet-saas-nine.vercel.app`
- 4 clés payantes en stand-by : `MARKETDATA_API_KEY`, `IEX_CLOUD_API_KEY`, `TMX_API_KEY`, `ETF_GLOBAL_API_KEY`
- Stripe toujours en placeholder — à remplacer à l'activation

### État Railway après session
Toutes les clés gratuites disponibles sont configurées. Fondamentaux/DCF/Dirigeants opérationnels en prod.

---

---

## Session 8 — 26/05/2026 — Test onglet Dirigeants + diagnostic FMP

### Résultat du test
- FMP API key valide ✅ — profile, fundamentals, DCF opérationnels en prod
- Insider trading ❌ — `/stable/insider-trading` retourne 404 (endpoint retiré plan gratuit FMP août 2025)
- Onglet Dirigeants mis en stand-by — affiche message d'erreur propre, pas de crash
- Aucune modification de code requise pour activer quand plan FMP upgradé

---

---

---

## Session 9 — 26/05/2026 — Backfill BRVM Railway

### Action
- `POST /api/market/brvm/backfill` déclenché manuellement sur Railway (header `x-cron-secret`)

### Résultat
| Métrique | Valeur |
|----------|--------|
| Statut | ✅ `success: true` |
| Source | SikaFinance (source 1) |
| Symboles couverts | 29 / 29 |
| Rows insérées/mises à jour | **1 855** |
| Durée | 21s |
| Fallback bulletins BRVM | non nécessaire (0 symbole restant) |

SikaFinance a couvert les 29 symboles en un seul passage. La table `BRVMPriceHistory` en prod est maintenant seedée avec ~90 jours d'historique.

---

*Dernière mise à jour : 26/05/2026 (session 9 — backfill BRVM Railway)*
