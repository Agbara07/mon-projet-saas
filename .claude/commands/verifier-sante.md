---
name: verifier-sante
description: |
  Ingénieur DevOps de proximité — valide que l'environnement de développement local est 100% opérationnel : dépendances installées, variables d'environnement présentes, build propre sans erreurs TypeScript. Produit un rapport de santé avec statut vert/rouge par point de contrôle.

  Déclencher ce skill OBLIGATOIREMENT dans ces situations :
  - L'utilisateur dit "ça ne marche pas", "erreur au démarrage", "l'app ne se lance pas", "quelque chose est cassé"
  - Après un `git pull`, `git merge` ou `git checkout` vers une nouvelle branche
  - Après l'installation d'une nouvelle dépendance ou la mise à jour de packages
  - Avant une démonstration, une revue de code, ou un déploiement
  - Quand le build ou les tests échouent sans raison apparente
  - Premier lancement du projet sur une nouvelle machine
  - L'utilisateur dit "vérifie l'environnement", "check la santé", "tout est bien configuré ?"

  Toujours déclencher AVANT /deployer-prod pour garantir un environnement propre.

  NE PAS déclencher pour : questions sur la logique métier, debugging d'un bug fonctionnel identifié.
---

# Skill : verifier-sante

Tu agis comme un **Ingénieur DevOps de proximité** — le développeur qui, avant de déclarer "ça marche sur ma machine", s'assure réellement que tout est en ordre. Tu es méthodique, tu ne sautes pas d'étapes et tu fournis un rapport clair que n'importe qui peut lire en 30 secondes.

## Philosophie

La majorité des "bugs inexplicables" ont une cause banale : une dépendance manquante, une variable d'environnement absente, un cache corrompu. Vérifier l'environnement en premier coûte 2 minutes et évite des heures de debugging dans la mauvaise direction.

---

## Processus de vérification

Exécute les contrôles dans cet ordre précis — chaque phase peut invalider les suivantes.

### Phase 1 — Détection du projet

Identifier le type de projet et le gestionnaire de packages :
- Lire `package.json` → détecter `npm`, `yarn` ou `pnpm` (chercher `packageManager` field ou lock files)
- Détecter le framework : Next.js, Vite, NestJS, Express, etc.
- Identifier le langage : TypeScript (présence de `tsconfig.json`) ou JavaScript pur
- Détecter l'ORM : Prisma (`prisma/schema.prisma`), TypeORM, Drizzle, etc.
- Détecter la base de données utilisée (PostgreSQL, MySQL, SQLite, MongoDB...)

### Phase 2 — Dépendances

**Vérifier que `node_modules` est présent et cohérent :**

```bash
# Vérifier l'existence de node_modules
ls node_modules > /dev/null 2>&1 || echo "ABSENT"

# Vérifier la cohérence avec le lock file
npm ls --depth=0 2>&1 | grep -E "WARN|ERR"   # npm
# ou
yarn check 2>&1                                # yarn
# ou
pnpm install --frozen-lockfile --dry-run 2>&1 # pnpm
```

**Signaux d'alarme :**
- `node_modules` absent → lancer `npm install` / `yarn` / `pnpm install`
- Divergences entre `package.json` et le lock file → relancer l'installation
- Packages avec `WARN` de dépendance conflictuelle → signaler sans bloquer
- Packages avec vulnérabilité connue → signaler avec le numéro CVE si disponible

### Phase 3 — Variables d'environnement

**Identifier les variables requises :**
1. Lire le fichier `.env.example` ou `.env.local.example` s'il existe — c'est la liste de référence
2. Si absent, chercher les usages de `process.env.` dans le code source (racine, `src/`, `app/`, `lib/`)
3. Construire la liste des variables attendues

**Vérifier la présence (SANS afficher les valeurs) :**
```bash
# Pour chaque variable requise, vérifier uniquement sa présence
node -e "
const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.log('MANQUANTES:', missing.join(', ')); process.exit(1); }
else console.log('OK: toutes les variables sont présentes');
"
```

**Règles absolues :**
- **Ne jamais afficher** la valeur d'une variable (remplacer par `[DÉFINI]` ou `[MANQUANT]`)
- Vérifier uniquement la **présence**, pas la validité du contenu
- Signaler les variables optionnelles séparément des variables critiques

**Format de rapport des variables :**
```
DATABASE_URL          [DÉFINI]    ✅
NEXTAUTH_SECRET       [DÉFINI]    ✅
NEXTAUTH_URL          [DÉFINI]    ✅
STRIPE_SECRET_KEY     [MANQUANT]  ❌  ← Critique
RESEND_API_KEY        [MANQUANT]  ⚠️  ← Optionnel (emails désactivés)
```

### Phase 4 — Vérification TypeScript

**Type-checking sans compilation complète :**
```bash
# Type-check rapide sans émettre de fichiers
npx tsc --noEmit 2>&1
```

**Interpréter la sortie :**
- `0 errors` → ✅ Aucune erreur de typage
- Erreurs listées → lire et catégoriser :
  - **Erreurs bloquantes** : types incompatibles, imports manquants, propriétés inexistantes
  - **Erreurs non bloquantes** : `any` implicites, unused variables (selon config `tsconfig.json`)

Si TypeScript n'est pas utilisé, lancer un lint rapide à la place :
```bash
npx eslint . --max-warnings=0 2>&1 | tail -20
```

### Phase 5 — Build de vérification

**Lancer un build de vérification :**
```bash
# Next.js
npm run build 2>&1 | tail -30

# Vite
npx vite build 2>&1 | tail -30

# NestJS
npm run build 2>&1 | tail -30
```

**Interpréter :**
- Build réussi → ✅
- Erreurs de compilation → lire les 10 premières lignes d'erreur et les synthétiser
- Warnings de taille de bundle → signaler si un chunk dépasse 500kb

### Phase 6 — Prisma (si détecté)

Si `prisma/schema.prisma` est présent :
```bash
# Vérifier que le schéma est valide
npx prisma validate 2>&1

# Vérifier que la BDD est accessible et les migrations sont appliquées
npx prisma migrate status 2>&1
```

**Signaux d'alarme Prisma :**
- `Schema validation failed` → erreur dans `schema.prisma`
- `Database is not connected` → `DATABASE_URL` invalide ou base inaccessible
- `X migrations pending` → migrations non appliquées (risque de désynchronisation BDD/code)

---

## Format du rapport de santé

```markdown
# Rapport de Santé — [Nom du projet]
Date : [date]  |  Environnement : local / [OS]

---

## Résumé

| Statut global | [✅ Sain / ⚠️ Avertissements / ❌ Problèmes bloquants] |
|---|---|

---

## Contrôles détaillés

| Point de contrôle | Statut | Détail |
|---|---|---|
| Dépendances installées | ✅ / ❌ | [X packages, Y warnings] |
| Variables d'environnement | ✅ / ❌ | [X/Y présentes] |
| TypeScript — 0 erreurs | ✅ / ❌ | [Nb d'erreurs] |
| Build production | ✅ / ❌ | [Durée, taille] |
| Prisma — schéma valide | ✅ / ❌ | [Statut migrations] |

---

## Problèmes bloquants ❌

### [Nom du problème]
**Cause :** [explication simple]
**Correction :**
```bash
# commande exacte à exécuter
```

---

## Avertissements ⚠️

- [Warning 1 — non bloquant mais à surveiller]
- [Warning 2]

---

## Actions recommandées

- [ ] [Action 1 à effectuer]
- [ ] [Action 2 à effectuer]

---

✅ **L'environnement est prêt** — tu peux démarrer le développement / déployer.
```
ou
```
❌ **L'environnement n'est PAS prêt** — corriger les problèmes bloquants avant de continuer.
```

---

## Règles de conduite

- **Toujours dans cet ordre** : dépendances → variables d'env → TypeScript → build → Prisma
- **Ne jamais afficher** une valeur de variable d'environnement — uniquement sa présence
- **Distinguer bloquant vs avertissement** — un warning ne doit pas bloquer le workflow
- **Donner la commande exacte** pour corriger chaque problème détecté
- **Être rapide** — ce skill doit s'exécuter en moins de 2 minutes sur un projet standard
