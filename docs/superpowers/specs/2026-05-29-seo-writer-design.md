# Spec — seo-writer skill

**Date :** 2026-05-29  
**Auteur :** Session brainstorming — InvestSaaS  
**Statut :** Validé — prêt pour implémentation  
**Skill cible :** `.claude/commands/seo-writer.md`

---

## 1. Objectif

Créer le skill `seo-writer` : rédacteur pur qui reçoit un brief structuré (produit par `seo-strategist` Phase 2) et livre un article MDX complet prêt à publier sur Next.js 15, accompagné du scaffold d'infrastructure blog si absent.

**Hors scope :** génération du brief (rôle de `seo-strategist`), audit SEO trimestriel (futur `seo-auditor`), branchement DataForSEO/GSC (infrastructure externe).

---

## 2. Architecture globale

```
INPUT : Brief structuré (seo-strategist Phase 2)
│
├─── [PARALLÈLE] M7: Blog_Scaffolder
│         → génère infrastructure Next.js 15 simultanément
│         → ne bloque pas le pipeline contenu
│
└─── [PIPELINE SÉQUENTIEL]
      │
      M1: Brief_Analyzer ────── GATE ÉDITORIALE : brief_score ≥ 80/100
      │   FAIL → STOP + diagnostic 5 dimensions
      │
      M2: Outline_Engine ─────── GATE ÉDITORIALE : paa_coverage ≥ 90%
      │   FAIL → STOP + PAA non couvertes listées
      │
      M3: Draft_Engine ───────── GATE ÉDITORIALE : Flesch_FR ≥ 45
      │   FAIL → STOP + sections défaillantes + réécriture suggérée
      │
      M4: SEO_Evaluator ──────── GATE TECHNIQUE : density ∈ [1.2%, 1.8%]
      │   FAIL → auto-retry silencieux ×2 → ⚠️ GATE_PARTIAL si toujours KO
      │
      M5: EEEAT_Evaluator ────── GATE ÉDITORIALE : eeeat_score ≥ 75/100
      │   FAIL → STOP + diagnostic 4 dimensions + correctifs spécifiques
      │
      M6: MDX_Renderer ───────── GATE TECHNIQUE : MDX valide + frontmatter complet
          FAIL → auto-retry silencieux ×2 → ⚠️ GATE_PARTIAL si toujours KO
          │
          ▼
OUTPUT : article.mdx + score_report + infrastructure Next.js 15
```

**Règle de parallélisme :** M7 démarre dès réception du brief, en même temps que M1.  
**Règle de déterminisme :** chaque module a une entrée définie, une sortie définie, un périmètre strict.  
**Règle hybride gate failure :**
- Gates techniques (M4, M6) → auto-retry silencieux ×2
- Gates éditoriales (M1, M2, M3, M5) → STOP + diagnostic + humain requis

---

## 3. Spécifications des 7 modules

### M1 · Brief_Analyzer `[GATE ÉDITORIALE]`

| Champ | Valeur |
|-------|--------|
| INPUT | Brief structuré seo-strategist Phase 2 |
| PROCESS | Score 5 dimensions pondérées → `brief_score` |
| OUTPUT | `brief_score` (0-100) + diagnostic par dimension |
| GATE | `brief_score ≥ 80` → PASS · `< 80` → STOP + rapport dimensionnel |

```
D1 · Complétude données       25 pts
  volume + difficulté + PAA ≥ 3 items   → 25
  volume + difficulté + PAA < 3 items   → 15
  volume seul                           → 5
  aucune donnée DataForSEO              → 0

D2 · Score seo-strategist     20 pts
  score_pub ≥ 70              → 20
  score_pub ∈ [50, 70[        → 12
  score_pub ∈ [30, 50[        → 5
  score_pub < 30              → 0

D3 · Angle différenciant      25 pts
  (source : analyse SERP Playwright incluse dans le brief — pas de scraping frais)
  absent des top 3 SERP       → 25
  présent, traitement distinct → 15
  identique au top 1          → 0

D4 · CTA feature              15 pts
  feature payante + route     → 15
  feature gratuite            → 8
  aucune feature              → 0

D5 · Contraintes légales      15 pts
  YMYL + AMF-UMOA + interdits → 15
  YMYL seul                   → 8
  aucune mention              → 0

brief_score = Σ(D1..D5)   GATE : ≥ 80
```

---

### M2 · Outline_Engine `[GATE ÉDITORIALE]`

| Champ | Valeur |
|-------|--------|
| INPUT | Brief validé (brief_score ≥ 80) |
| PROCESS | Mappe PAA → H2/H3 · inject sections obligatoires |
| OUTPUT | Outline H1/H2/H3 + `paa_coverage` (%) |
| GATE | `paa_coverage ≥ 90%` → PASS · `< 90%` → STOP + PAA non couvertes |

```
paa_coverage = (PAA_mappées / PAA_total) × 100

Sections obligatoires systématiques :
  § Intro      (keyword < 100 mots, accroche chiffrée)
  § Corps      (PAA mappées en H2/H3)
  § CTA        (lien feature InvestSaaS)
  § Disclaimer (composant légal)
  § Conclusion (résumé + keyword clôture)

GATE : paa_coverage ≥ 90%
```

---

### M3 · Draft_Engine `[GATE ÉDITORIALE]`

| Champ | Valeur |
|-------|--------|
| INPUT | Outline validé (paa_coverage ≥ 90%) |
| PROCESS | Rédige section par section · Flesch_FR par section · loop interne si < 40 · word count check |
| OUTPUT | Draft brut + `flesch_global` + `section_scores[]` + `word_count` |
| GATE | `flesch_global ≥ 45` ET `word_count ∈ [target×0.8, target×1.2]` → PASS · sinon STOP |

```
Flesch_FR = 207 − (1.015 × ASL) − (73.6 × ASW)
  ASL = mots / phrases
  ASW = syllabes / mots

Flesch_global = Σ(Flesch_section_i × mots_i) / Σ(mots_i)

word_count_check :
  target = longueur_cible du brief (moyenne top 3 SERP ±20%)
  PASS  : draft_words ∈ [target × 0.8, target × 1.2]
  FAIL  : STOP + "X mots produits vs Y cible (écart Z%) — enrichir ou condenser"

Loop interne (si section_score < 40, max 1 pass) :
  → couper phrases > 20 mots
  → remplacer mots > 3 syllabes par alternatives courtes
  → ajouter exemples numériques concrets

Voix par cluster :
  BRVM       → précis, sources CREPMF/SikaFinance, chiffres FCFA
  Éducatif   → pédagogique, progression logique, exemples numériques
  Outils     → orienté action, étapes numérotées
  Acquisition → comparatif, bénéfices plateforme, social proof

GATE : flesch_global ≥ 45 ET word_count ∈ [target×0.8, target×1.2]
```

---

### M4 · SEO_Evaluator `[GATE TECHNIQUE → auto-retry ×2]`

| Champ | Valeur |
|-------|--------|
| INPUT | Draft complet |
| PROCESS | Calcule `keyword_density` · ajustement auto si hors range |
| OUTPUT | Draft ajusté + `seo_metrics{}` |
| GATE | `density ∈ [1.2%, 1.8%]` → PASS · hors range → retry ×2 → `⚠️ GATE_PARTIAL` |

```
keyword_density = (occurrences_keyword / total_words) × 100
  (variantes morphologiques comptées comme même famille)

5 checkpoints placement (binaires) :
  pos_H1         keyword dans H1                     ✓/✗
  pos_intro      keyword dans < 100 premiers mots    ✓/✗
  pos_h2_min2    keyword dans ≥ 2 H2                ✓/✗
  pos_conclusion keyword dans conclusion             ✓/✗
  lsi_count      ≥ 5 termes LSI uniques              ✓/✗

SEO_placement_score = (checkpoints_OK / 5) × 100

Ajustement auto (retry silencieux) :
  density < 1.2% → injecter keyword dans 3 transitions naturelles
  density > 1.8% → remplacer surplus par LSI
  max 2 retry → si toujours KO : ⚠️ GATE_PARTIAL

GATE technique : density ∈ [1.2%, 1.8%]
```

---

### M5 · EEEAT_Evaluator `[GATE ÉDITORIALE]`

| Champ | Valeur |
|-------|--------|
| INPUT | Draft SEO-validé |
| PROCESS | Score 4 dimensions × 25 pts → `eeeat_score` |
| OUTPUT | `eeeat_score` (0-100) + diagnostic dimensionnel + correctifs |
| GATE | `eeeat_score ≥ 75` → PASS · `< 75` → STOP + dimensions KO + actions |

```
E · Experience        25 pts
  données réelles plateforme citées avec chiffre   → 25
  référence plateforme sans chiffre                → 15
  aucune référence                                 → 0

E · Expertise         25 pts
  ≥ 3 termes techniques exacts + corrects          → 25
  1–2 termes techniques                            → 15
  vocabulaire générique                            → 0
  termes techniques incorrects                     → −10

A · Authoritativeness 25 pts
  ≥ 2 sources primaires liées (BCEAO/SikaFinance/CREPMF/AMF-UMOA) → 25
  1 source primaire                                → 12
  sources secondaires seulement                   → 5
  aucune source                                    → 0

T · Trust             25 pts (cumulatif)
  0 conseil investissement     → 10 pts
  disclaimer présent           → 8 pts
  auteur identifié             → 4 pts
  date publication visible     → 3 pts

eeeat_score = Σ(E+E+A+T)   GATE : ≥ 75
```

---

### M6 · MDX_Renderer `[GATE TECHNIQUE → auto-retry ×2]`

| Champ | Valeur |
|-------|--------|
| INPUT | Draft final (post-M5) |
| PROCESS | Convertit en MDX · frontmatter · JSON-LD · composants React |
| OUTPUT | `article.mdx` complet + rapport de validation parse |
| GATE | Parse MDX sans erreur + frontmatter 12 champs → PASS · erreur → retry ×2 |

```yaml
# Frontmatter obligatoire (12 champs)
---
slug:        kebab-case, keyword principal, sans date
title:       < 60 chars, keyword + "| InvestSaaS"
description: < 155 chars, bénéfice concret
publishedAt: ISO 8601
updatedAt:   ISO 8601
author:      "Équipe InvestSaaS"
tags:        [cluster, keyword, marché]
cluster:     pilier d'appartenance
canonical:   https://investsaas.com/blog/{slug}
schemaType:  "Article" | "FAQPage"
ctaFeature:  route InvestSaaS cible (ex: /screener)
noIndex:     false
---
```

JSON-LD injecté selon schemaType :
- `Article` : headline, author, publisher, datePublished, dateModified, description
- `FAQPage` : mainEntity avec Question/Answer pour chaque PAA

---

### M7 · Blog_Scaffolder `[PARALLÈLE — aucune gate]`

| Champ | Valeur |
|-------|--------|
| INPUT | Brief (slug, cluster, schemaType) — démarre avec M1 |
| PROCESS | Génère fichiers Next.js 15 manquants |
| OUTPUT | Liste fichiers + contenu complet |
| GATE | Aucune — exécution déterministe |

Fichiers générés si absents :
```
content/blog/                             ← créé à la racine du repo si absent
content/blog/{slug}.mdx
frontend/src/app/blog/[slug]/page.tsx     ← generateMetadata + MDX render
frontend/src/app/blog/layout.tsx
frontend/src/app/blog/page.tsx            ← index blog public
frontend/src/lib/blog.ts                  ← getBlogPost, getAllBlogPosts
frontend/src/components/blog/Callout.tsx
frontend/src/components/blog/CTABanner.tsx
frontend/src/components/blog/DataTable.tsx
frontend/src/app/sitemap.ts              ← mis à jour avec slug
```

Dépendances à installer (première fois) :
```bash
cd frontend && npm install next-mdx-remote gray-matter
```

---

## 4. Formules de scoring

### F1 · Brief Score
```
brief_score = D1 + D2 + D3 + D4 + D5   GATE : ≥ 80
```

### F2 · PAA Coverage
```
paa_coverage = (PAA_mappées / PAA_total) × 100   GATE : ≥ 90%
```

### F3 · Flesch_FR (Kandel & Moles, adapté financier)
```
Flesch_FR = 207 − (1.015 × ASL) − (73.6 × ASW)
Flesch_global = Σ(Flesch_section_i × mots_i) / Σ(mots_i)
GATE : ≥ 45   (Standard — accessible investisseurs retail)
```

### F4 · Keyword Density
```
keyword_density = (occurrences_keyword / total_words) × 100
GATE technique : density ∈ [1.2%, 1.8%]
```

### F5 · E-E-A-T Score
```
eeeat_score = E_exp + E_expt + A_auth + T_trust   GATE : ≥ 75
```

### F6 · Quality Score Global (rapport livraison)
```
quality_score =
  brief_score             × 0.15 +
  paa_coverage            × 0.20 +
  flesch_clamped          × 0.20 +
  seo_density_norm        × 0.20 +
  eeeat_floored           × 0.25

# Clamping pour garantir quality_score ∈ [0, 100]
flesch_clamped  = max(0, min(100, flesch_global))
eeeat_floored   = max(0, eeeat_score)

# Formule seo_density_norm corrigée (distance depuis borne)
seo_density_norm :
  si density ∈ [1.2%, 1.8%] → 100
  sinon :
    dist = max(0, 1.2 − density) + max(0, density − 1.8)
    seo_density_norm = max(0, 100 − dist × 500)

  # density = 1.0% → dist = 0.2 → 100−100 = 0   (pénalité max)
  # density = 1.1% → dist = 0.1 → 100−50  = 50  (pénalité modérée)
  # density = 2.0% → dist = 0.2 → 100−100 = 0   (pénalité max)

Interprétation :
  ≥ 85   Article premium     → publier immédiatement
  75–84  Article solide      → optimisations mineures
  65–74  Article acceptable  → enrichissement J+30
  < 65   Insuffisant         → révision majeure
```

---

## 5. MDX Output Format

````mdx
---
slug: "{slug}"
title: "{title} | InvestSaaS"
description: "{description}"
publishedAt: "{ISO-date}"
updatedAt: "{ISO-date}"
author: "Équipe InvestSaaS"
tags: ["{cluster}", "{keyword}", "{marché}"]
cluster: "{pilier}"
canonical: "https://investsaas.com/blog/{slug}"
schemaType: "Article" | "FAQPage"
ctaFeature: "/{route-feature}"
noIndex: false
---

import { Callout } from '@/components/blog/Callout'
import { CTABanner } from '@/components/blog/CTABanner'
import { DataTable } from '@/components/blog/DataTable'
import { Disclaimer } from '@/components/ui/Disclaimer'

<script type="application/ld+json" suppressHydrationWarning>{`{ ... }`}</script>

# {H1}

{§ Intro — keyword < 100 mots, accroche chiffrée}

## {H2 — PAA #1}
{contenu}

## {H2 — PAA #2}
{contenu}

<CTABanner feature="{nom}" href="{ctaFeature}" label="{CTA}" />

## Conclusion

{§ résumé actionnable + keyword clôture}

<Disclaimer variant="inline" />
````

---

## 6. Intégrations

### 6A · seo-strategist → seo-writer
Le brief Phase 2 de `seo-strategist` est l'input natif de M1 sans transformation.

```
seo-strategist Phase 2 produit →
  Score publication     → D2 M1
  Données DataForSEO    → D1 M1 + M4
  Analyse SERP Playwright → D3 M1 + M2 (PAA)
  Signal GSC            → contexte M3 (longueur cible ±20% top 3)
  Structure recommandée → input direct M2
  CTA feature           → D4 M1 + CTABanner M6
  E-E-A-T requis        → D5 M1 + M5
```

### 6B · Superpowers intégrés

| Moment | Superpower | Rôle |
|--------|-----------|------|
| Démarrage M7 | `dispatching-parallel-agents` | M7 parallèle à M1–M6 |
| Post-M6 | `verification-before-completion` | Checklist on-page finale |
| Gate fail ×2 (M4/M6) | Suggère `systematic-debugging` | Diagnostic structuré avant flag ⚠️ GATE_PARTIAL |

### 6C · MCP Playwright (post-publication)
Validation rendu réel : title, meta, canonical, JSON-LD parse, screenshot mobile 375px, indexation GSC J+7.

### 6D · Modes d'invocation

| Mode | Input | Process | Usage |
|------|-------|---------|-------|
| Pipeline complet | Brief Phase 2 complet | M1→M6 + M7 parallèle | Production hebdo |
| Module isolé | Draft existant | Module unique (M1/M3/M4/M5/M6) | Re-validation gate précise |
| Audit article | article.mdx publié | M4 + M5 + M6 | J+30 / J+90 decision loop |
| Scaffold seul | slug + cluster | M7 uniquement | Init blog avant premier article |

---

## 7. Rapport de livraison (output final)

```markdown
## Livraison seo-writer — {slug}

### Score Qualité Global
quality_score : {score}/100 — {interprétation}

| Module | Métrique        | Score  | Gate    | Statut |
|--------|-----------------|--------|---------|--------|
| M1     | brief_score     | {X}/100| ≥ 80    | ✅/⚠️  |
| M2     | paa_coverage    | {X}%   | ≥ 90%   | ✅/⚠️  |
| M3     | flesch_global   | {X}    | ≥ 45    | ✅/⚠️  |
| M4     | keyword_density | {X}%   | 1.2–1.8 | ✅/⚠️  |
| M5     | eeeat_score     | {X}/100| ≥ 75    | ✅/⚠️  |
| M6     | mdx_valid       | ✓/✗    | parse   | ✅/⚠️  |

### Fichiers livrés
□ content/blog/{slug}.mdx
□ frontend/src/app/blog/[slug]/page.tsx
□ frontend/src/app/blog/layout.tsx
□ frontend/src/app/blog/page.tsx
□ frontend/src/lib/blog.ts
□ frontend/src/components/blog/*.tsx
□ frontend/src/app/sitemap.ts

### Actions post-publication
□ npm install next-mdx-remote gray-matter (si première fois)
□ Soumettre URL dans GSC — URL Inspection → Request Indexing
□ Validation Playwright J+0
□ Signal GSC J+7 (seo-strategist Phase 3)
```

---

## 8. Contraintes et règles absolues

- `quality_score ≥ 75` avant publication — sinon enrichissement obligatoire
- Brief `seo-strategist` obligatoire — jamais d'article ex nihilo
- `superpowers:verification-before-completion` avant chaque livraison MDX
- `<Disclaimer variant="inline" />` systématique en fin d'article
- Aucune formulation conseil en investissement (AMF-UMOA)
- `dateModified` à jour dans JSON-LD à chaque modification
- Cluster d'appartenance identifié avant rédaction — pas d'article isolé
- M7 génère l'infrastructure — ne pas créer les fichiers blog manuellement
