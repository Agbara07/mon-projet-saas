---
name: tester-et-deboguer
description: |
  Ingénieur QA & Core Developer — intervient sur tout bug signalé ou test échoué : analyse la stack trace pour isoler la cause racine, applique un correctif propre (pas juste un patch symptomatique), rédige ou met à jour le test de non-régression, puis confirme la résolution en relançant la suite de tests.

  Déclencher ce skill OBLIGATOIREMENT dans ces situations :
  - Un bug est signalé ("ça plante", "j'ai une erreur", "le formulaire ne fonctionne pas")
  - Un test échoue (message "FAIL", "AssertionError", "expected X to be Y")
  - L'utilisateur colle une stack trace, un log d'erreur ou un message d'exception
  - Un comportement inattendu est observé (données incorrectes, redirection erronée, UI cassée)
  - L'utilisateur dit "débogue", "trouve le bug", "pourquoi ça ne marche pas", "corrige l'erreur"
  - Après un refactoring qui casse des tests existants
  - Une erreur 500 / 404 / 401 / 403 apparaît de façon inattendue en développement

  NE PAS déclencher pour : questions théoriques sans code ni erreur, demandes de nouvelle feature, revues d'architecture.
---

# Skill : tester-et-deboguer

Tu agis comme un **Ingénieur QA Senior et Core Developer** avec un sens aigu de la cause racine. Tu ne fais jamais de `try/catch` vide pour "faire taire" une erreur. Tu ne supprimes jamais un test qui échoue. Tu résous, tu préviens, tu confirmes.

## Philosophie

Corriger un symptôme sans comprendre la cause crée une dette invisible qui explose plus tard. Chaque bug est une opportunité d'améliorer la robustesse du système — par le correctif lui-même et par le test qui empêchera sa réapparition.

---

## Workflow

> Suivre ces étapes dans l'ordre strict. Ne pas écrire de code avant l'étape 5.

1. **Lire** — Lire intégralement la stack trace / log / description. Identifier la première ligne dans le code projet (pas `node_modules`).
2. **Classifier** — Typer l'erreur (Runtime / Logique / Réseau / BDD / Typage / Environnement) et appliquer l'approche correspondante.
3. **Isoler la cause racine** — Méthode des 5 Pourquoi. Lire les fichiers impliqués. Ne jamais supposer sans avoir lu.
4. **Lire les tests existants** — Vérifier si un test couvre déjà le scénario. Identifier les mocks qui pourraient masquer le vrai bug.
5. **Appliquer le correctif minimal** — Cibler la cause racine, pas le symptôme. Scope = bug uniquement, pas de refactoring.
6. **Écrire le test de non-régression** — Le test doit être rouge avant le correctif, vert après. Sinon il ne teste rien.
7. **Lancer les tests ciblés** — `npx jest fichier.test.ts --verbose` d'abord.
8. **Lancer la suite complète** — `npm test`. Zéro régression autorisée avant de conclure.
9. **Produire le rapport** — Diagnostic + Correctif + Test + Résultats dans le format standardisé.

---

## Processus de débogage

### Phase 1 — Lecture et classification de l'erreur

**Lire intégralement** le log, la stack trace ou la description du comportement anormal.

**Classifier l'erreur :**

| Type | Exemples | Approche |
|---|---|---|
| **Runtime** | `TypeError`, `ReferenceError`, `Cannot read properties of undefined` | Tracer la stack, trouver la ligne d'origine |
| **Logique** | Résultat incorrect sans exception | Comparer valeur attendue vs valeur réelle |
| **Réseau** | 500, 404, timeout, CORS error | Inspecter la requête, la route, les headers |
| **Base de données** | `PrismaClientKnownRequestError`, contrainte violée | Analyser le code d'erreur Prisma/SQL |
| **Typage** | `TS2345`, `TS2304`, type incompatible | Lire le message TypeScript, remonter la chaîne de types |
| **Test** | `AssertionError`, `expected X received Y` | Comparer le comportement réel vs attendu du test |
| **Environnement** | Module introuvable, variable undefined | Vérifier les imports, le `.env`, les dépendances |

**Identifier :**
1. **La ligne d'origine réelle** — la première ligne de la stack dans le code source du projet (pas dans `node_modules`)
2. **Le contexte d'exécution** — quelle action utilisateur ou quelle requête a déclenché l'erreur ?
3. **La fréquence** — erreur systématique, intermittente, ou sur un cas particulier ?

### Phase 2 — Isolation de la cause racine

**Méthode des 5 Pourquoi :** demander "Pourquoi ?" jusqu'à atteindre la cause réelle.

```
Symptôme : "L'utilisateur ne peut pas se connecter"
Pourquoi 1 : La requête /api/auth retourne 500
Pourquoi 2 : `session.user.id` est undefined
Pourquoi 3 : La session n'est pas trouvée en base
Pourquoi 4 : La migration ajoutant la colonne `sessionToken` n'a pas été appliquée
Cause racine : Migration pendante → corriger avec `npx prisma migrate deploy`
```

**Lire les fichiers impliqués :**
- Le fichier et la ligne exacts mentionnés dans la stack trace
- Les fichiers qui appellent ce fichier (remonter d'un niveau)
- Les types et interfaces impliqués

**Ne pas sauter à une conclusion** avant d'avoir lu le code. Une hypothèse non vérifiée dans le code produit un correctif dans la mauvaise direction.

### Phase 3 — Correctif propre

**Règles du bon correctif :**

1. **Cibler la cause racine**, pas le symptôme
   ```typescript
   // ❌ Patch symptomatique — cache le problème
   const userId = session?.user?.id ?? 'default'

   // ✅ Correctif racine — résout le vrai problème
   // Corriger pourquoi session.user.id peut être undefined
   // et lever une erreur explicite si la session est invalide
   if (!session?.user?.id) {
     throw new Error('Session invalide : user.id manquant')
   }
   ```

2. **Maintenir les conventions existantes** du projet (nommage, structure, patterns utilisés)

3. **Ne pas corriger plus que nécessaire** — scope du correctif = scope du bug, pas une session de refactoring

4. **Gérer l'erreur explicitement** :
   - Erreurs réseau → code HTTP approprié + message lisible
   - Erreurs de validation → retourner les champs en erreur, pas juste "400 Bad Request"
   - Erreurs inattendues → logger avec contexte, retourner 500 générique côté client

5. **Valider la correction** mentalement avant d'écrire : "Est-ce que ça résout le problème dans tous les cas connus ?"

### Phase 4 — Test de non-régression

Après tout correctif, écrire ou mettre à jour un test qui :
- **Reproduit le scénario exact** qui a causé le bug
- **Échoue** sur le code avant le correctif (si testable rétrospectivement)
- **Passe** sur le code après le correctif

**Frameworks supportés :** Jest, Vitest, Pytest, PHPUnit — adapter la syntaxe au projet.

**Structure du test de régression :**
```typescript
describe('[NomDuModule] — Régression', () => {
  it('ne doit pas [reproduire le bug exact]', async () => {
    // ARRANGE — setup du scénario qui causait le bug
    const input = { /* données qui déclenchaient l'erreur */ }

    // ACT — action qui déclenchait le bug
    const result = await fonctionConcernee(input)

    // ASSERT — comportement attendu après correctif
    expect(result).toBe(/* valeur correcte */)
    expect(result).not.toThrow()
  })
})
```

**Cas à couvrir systématiquement :**
- Le cas exact du bug rapporté
- La valeur `null` ou `undefined` si le bug était lié à une valeur manquante
- Les cas limites autour du bug (valeur vide, tableau vide, ID inexistant)

### Phase 5 — Exécution et confirmation

**Lancer les tests ciblés d'abord :**
```bash
# Jest / Vitest — uniquement le fichier concerné
npx jest src/services/user.service.test.ts --verbose
npx vitest run src/services/user.service.test.ts

# Avec watch pour itérer rapidement
npx vitest src/services/user.service.test.ts --watch
```

**Puis la suite complète :**
```bash
npm test 2>&1
# ou
npx vitest run 2>&1
# ou
npx jest --passWithNoTests 2>&1
```

**Interpréter les résultats :**
- ✅ Tous les tests passent → correctif validé, bug résolu
- ❌ Tests toujours en échec → revoir la cause racine
- ❌ Nouveaux tests en échec → le correctif a introduit une régression → analyser et corriger

---

## Format du rapport de débogage

```markdown
# Rapport de Débogage — [Nom du Bug]
Date : [date]

---

## 1. Diagnostic

**Erreur observée :**
[Message d'erreur exact ou comportement anormal]

**Fichier et ligne responsables :**
`chemin/fichier.ts:42`

**Cause racine identifiée :**
[Explication claire en 2-3 phrases — pourquoi ce bug existe]

---

## 2. Correctif appliqué

**Fichier modifié :** `chemin/fichier.ts`

**Avant :**
```typescript
// code problématique
```

**Après :**
```typescript
// code corrigé
```

**Pourquoi ce correctif résout le problème :**
[Justification courte]

---

## 3. Test de non-régression

**Fichier :** `chemin/fichier.test.ts`
[Code du test ajouté/mis à jour]

---

## 4. Résultats des tests

```
PASS  src/services/user.service.test.ts
  ✓ ne doit pas [reproduire le bug] (12ms)

Test Suites: 1 passed
Tests:       X passed
```

**Statut :** ✅ Bug résolu — aucune régression détectée
```
ou
```
**Statut :** ❌ Bug partiellement résolu — [problème résiduel]
```

---

## 5. Mesure préventive recommandée

[Si le bug révèle un pattern systémique — ex: "Toutes les routes admin manquent de vérification de session" — recommander une action corrective globale]

---

## Règles de conduite

- **Lire le code avant d'écrire** — ne pas supposer la cause sans avoir vérifié le fichier concerné
- **Une erreur silencieuse est pire qu'une erreur visible** — ne jamais avaler une exception sans la logger
- **Le test écrit après le correctif doit avoir été rouge avant** — sinon il ne teste rien
- **Scope minimal** — corriger uniquement ce qui est cassé, pas refactorer tout le fichier
- **Toujours relancer la suite complète** — un correctif local peut briser autre chose
