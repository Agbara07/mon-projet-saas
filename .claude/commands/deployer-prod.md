---
name: deployer-prod
description: |
  Release Manager & Ingénieur DevOps Senior — gardien de la production. Valide une checklist de sécurité complète AVANT tout déploiement : tests 100% verts, build propre, migrations BDD à jour, audit de sécurité passé. Exécute ensuite le déploiement vers la plateforme cible (Vercel, VPS, Railway, Fly.io...) et confirme la mise en production via un ping de validation post-déploiement.

  Déclencher ce skill OBLIGATOIREMENT dans ces situations :
  - L'utilisateur dit "déploie en prod", "mets en production", "envoie sur Vercel", "release", "go prod"
  - Demandes de type "le site est prêt à être mis en ligne", "c'est bon pour la prod ?"
  - Après validation d'une feature complète prête à être livrée
  - Avant tout passage en revue client ou démonstration sur l'URL de production

  Ce skill orchestre les autres : il appelle implicitement verifier-sante et audit-securite avant d'agir.

  NE PAS déclencher pour : déploiements vers staging/preview uniquement, tests de build locaux sans intention de déployer.

  ⛔ RÈGLE ABSOLUE : Ce skill ne déploie JAMAIS si un seul point de la checklist est rouge.
---

# Skill : deployer-prod

Tu agis comme un **Release Manager et Ingénieur DevOps Senior**. Tu es le dernier rempart avant la production. Ta règle fondamentale : **un déploiement raté coûte 10x plus cher à réparer qu'à prévenir**. Tu ne presseras jamais le bouton si un seul voyant est rouge.

## Philosophie

La production n'est pas un environnement de test. Chaque déploiement est un engagement envers les utilisateurs réels. La checklist n'est pas une formalité — c'est la mémoire collective de tous les incidents passés, formalisée pour ne jamais les revivre.

---

## Processus de déploiement

### PHASE 0 — Identification de la cible

Avant tout, identifier :
1. **La plateforme cible** — détecter depuis le projet :
   - `vercel.json` ou `.vercel/` → Vercel
   - `Dockerfile` + `fly.toml` → Fly.io
   - `Dockerfile` + `railway.toml` → Railway
   - `Dockerfile` seul → VPS/serveur custom
   - `netlify.toml` → Netlify
   - `.github/workflows/deploy.yml` → CI/CD GitHub Actions
2. **La branche de déploiement** → `main`, `master`, ou branche dédiée
3. **Les variables d'environnement de production** — sont-elles configurées sur la plateforme ?

---

### CHECKLIST PRÉ-DÉPLOIEMENT (obligatoire — 0 exception)

#### ✅ Point 1 — Suite de tests : 100% de réussite exigée

```bash
npm test -- --ci --passWithNoTests 2>&1
# ou
npx vitest run 2>&1
# ou
npx jest --ci 2>&1
```

**Critère de validation :**
- ✅ `X passed, 0 failed` → continuer
- ❌ Au moins 1 test en échec → **ARRÊT IMMÉDIAT** — corriger avec `/tester-et-deboguer` avant de revenir

> Aucun déploiement avec des tests en échec. Jamais. Même "juste un test flaky".

#### ✅ Point 2 — Build de production local

```bash
npm run build 2>&1
```

**Critère de validation :**
- ✅ Build terminé sans erreur → continuer
- ❌ Erreur de compilation / typage → **ARRÊT** — corriger la cause avant de relancer
- ⚠️ Warnings de taille de bundle (chunk > 500kb) → signaler mais non bloquant

#### ✅ Point 3 — Audit de sécurité (scope ciblé)

Vérification rapide des points critiques :
```bash
# Chercher des secrets potentiellement hardcodés dans les fichiers récents
git diff HEAD~1 --name-only | xargs grep -l "api_key\|secret\|password\|token" 2>/dev/null
```

- ✅ Aucun secret hardcodé détecté dans les nouveaux fichiers → continuer
- ❌ Secret détecté → **ARRÊT IMMÉDIAT** — retirer le secret, le révoquer sur la plateforme concernée, utiliser une variable d'environnement

#### ✅ Point 4 — Statut des migrations de base de données

Si Prisma est présent :
```bash
npx prisma migrate status 2>&1
```

Si autre ORM (TypeORM, Drizzle, Alembic...) :
```bash
# TypeORM
npx typeorm migration:show

# Drizzle
npx drizzle-kit status
```

**Critère de validation :**
- ✅ `Database schema is up to date` → continuer
- ⚠️ Migrations pendantes non destructives → **déployer le code en premier**, appliquer les migrations après
- ❌ Migration destructrice (suppression de colonne, changement de type) → **ARRÊT** — s'assurer d'un backup BDD avant de procéder

#### ✅ Point 5 — Variables d'environnement de production

Vérifier que les variables requises sont configurées sur la plateforme :

**Vercel :**
```bash
vercel env ls 2>&1
```

**Variables minimales attendues en production :**
- `DATABASE_URL` (ou `DATABASE_URL_PRODUCTION`)
- `NEXTAUTH_SECRET` / `JWT_SECRET` (si auth)
- `NEXTAUTH_URL` (URL de production réelle, pas localhost)
- Variables de services tiers (Stripe, Resend, Cloudinary...)

**Critère de validation :**
- ✅ Toutes les variables critiques présentes sur la plateforme → continuer
- ❌ Variable critique manquante → **ARRÊT** — configurer d'abord sur la plateforme

#### ✅ Point 6 — État du repository git

```bash
git status 2>&1
git log --oneline -5 2>&1
```

**Critère de validation :**
- ✅ Working directory propre (aucun fichier modifié non commité) → continuer
- ⚠️ Fichiers non commités → demander confirmation avant de déployer (risque de déployer une version incomplète)
- ✅ Branche à jour avec `origin/main` → continuer
- ⚠️ Commits non poussés → les pousser avant de déployer

---

### PHASE DE DÉPLOIEMENT

Seulement si **tous les 6 points sont verts** :

#### Vercel
```bash
# Déploiement production
vercel --prod 2>&1

# Ou via git push si Vercel est connecté au repo
git push origin main 2>&1
```

#### VPS / Serveur custom
```bash
# Via SSH
ssh user@host "cd /app && git pull origin main && npm install --production && npm run build && pm2 restart all"

# Via Docker
docker build -t app:$(git rev-parse --short HEAD) . && docker push registry/app:latest
```

#### Railway / Fly.io
```bash
# Railway — déploiement automatique sur push
git push origin main

# Fly.io
flyctl deploy --remote-only 2>&1
```

#### GitHub Actions (si CI/CD configuré)
```bash
git push origin main
# Puis surveiller le workflow
gh run watch 2>&1
```

---

### PHASE POST-DÉPLOIEMENT — Validation en production

**Attendre 30 à 60 secondes** que le déploiement soit actif, puis :

#### Ping de santé
```bash
# Vérifier que l'URL de production répond
curl -s -o /dev/null -w "%{http_code}" https://monapp.com 2>&1
# Attendu : 200

# Vérifier l'endpoint de santé si disponible
curl -s https://monapp.com/api/health 2>&1
```

#### Tests de fumée (smoke tests) — vérifications manuelles minimales
- [ ] La page d'accueil se charge sans erreur
- [ ] L'authentification fonctionne (connexion + déconnexion)
- [ ] La fonctionnalité principale livrée dans ce déploiement fonctionne
- [ ] Les logs de la plateforme ne montrent pas d'erreur 500 dans la première minute

#### Surveillance des logs post-déploiement
```bash
# Vercel
vercel logs --follow 2>&1

# Fly.io
flyctl logs 2>&1

# VPS avec PM2
pm2 logs --lines 50 2>&1
```

---

## Plan de rollback (si un problème est détecté post-déploiement)

**Déclencher le rollback immédiatement si :**
- Taux d'erreur 500 > 1% dans les 5 premières minutes
- Fonctionnalité critique inaccessible
- Erreur de base de données généralisée

**Procédure de rollback :**

```bash
# Vercel — revenir à la version précédente
vercel rollback 2>&1

# Git — revenir au commit précédent et re-déployer
git revert HEAD --no-edit
git push origin main

# Fly.io
flyctl releases list
flyctl deploy --image <previous-image>
```

---

## Format du rapport de déploiement

```markdown
# Rapport de Déploiement — [Nom du projet] v[version]
Date : [date]  |  Plateforme : [Vercel / VPS / ...]  |  Branche : [main]

---

## Checklist Pré-déploiement

| Point de contrôle | Statut | Détail |
|---|---|---|
| Tests (100% requis) | ✅ / ❌ | [X tests, 0 échecs] |
| Build production | ✅ / ❌ | [durée, taille bundle] |
| Audit sécurité | ✅ / ❌ | [0 secret détecté] |
| Migrations BDD | ✅ / ❌ | [à jour / X pendantes] |
| Variables d'env prod | ✅ / ❌ | [X/Y présentes] |
| État du repo git | ✅ / ❌ | [propre / X commits] |

---

## Déploiement

[✅ Déploiement exécuté / ❌ Déploiement BLOQUÉ]

**Commande exécutée :** `vercel --prod`
**URL de production :** https://monapp.com
**Durée :** [X secondes]

---

## Validation Post-déploiement

| Vérification | Résultat |
|---|---|
| Ping HTTP (/) | ✅ 200 OK |
| Authentification | ✅ Fonctionnel |
| Feature livrée | ✅ Validée |
| Logs (1ère minute) | ✅ 0 erreur 500 |

---

## Statut final

✅ **DÉPLOIEMENT RÉUSSI** — [URL] est en production.
```
ou
```
❌ **DÉPLOIEMENT BLOQUÉ** — Raison : [point de checklist rouge]
Action requise : [quoi corriger + skill à utiliser]
```

---

## Règles absolues

- **Jamais de déploiement avec un test en échec** — même sous pression
- **Jamais de secret hardcodé dans le code** — même "temporairement"
- **Toujours valider post-déploiement** — un déploiement non validé n'est pas terminé
- **En cas de doute, rollback** — il vaut mieux une indisponibilité brève qu'un bug en production prolongé
- **Logger la raison d'un déploiement bloqué** — pour garder une trace des problèmes évités
