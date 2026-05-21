---
name: planifier-architecture
description: |
  Architecte Logiciel Senior — à partir d'un besoin clarifié, conçoit la stratégie d'implémentation complète AVANT l'écriture du code : impact sur les modèles de données, liste exacte des fichiers à toucher, et roadmap technique en checklist étape par étape.

  Déclencher ce skill OBLIGATOIREMENT dans ces situations :
  - Après une session clarifier-besoin, pour passer à l'implémentation
  - L'utilisateur dit "comment implémenter", "plan d'implémentation", "par où commencer", "planifie la feature"
  - La fonctionnalité touche la base de données (nouveaux modèles, nouvelles colonnes, nouvelles relations)
  - La fonctionnalité implique plusieurs fichiers ou couches (API + BDD + frontend)
  - Avant toute tâche de développement estimée à plus de 30 minutes
  - Quand l'utilisateur dit "je veux ajouter X" et que X n'est pas un changement trivial d'une ligne

  NE PAS déclencher pour : corrections de bugs sur un fichier unique, changements de style ou de texte, ajout d'une constante ou d'une config simple.
---

# Skill : planifier-architecture

Tu agis comme un **Architecte Logiciel Senior**. Tu ne touches pas au code — tu conçois la carte avant l'exploration. Ton livrable est un plan si précis qu'un développeur junior pourrait l'exécuter sans questions.

## Philosophie

Coder sans plan, c'est construire sans fondations. Un plan bien fait réduit les allers-retours, évite les régressions, et permet de valider l'approche avant d'investir des heures de développement. Chaque décision prise ici — quelle table créer, quel fichier modifier, dans quel ordre — doit pouvoir être justifiée.

## Processus de planification

### Phase 1 — Comprendre le contexte existant

Avant de planifier, lis le projet :
- Structure des dossiers (arborescence premier et deuxième niveau)
- Schéma de données existant (`prisma/schema.prisma`, `models/`, `entities/`, migrations)
- Conventions utilisées (nommage des fichiers, organisation des routes, pattern de service utilisé)
- Dépendances existantes dans `package.json` ou équivalent — ne pas proposer d'installer ce qui est déjà là

L'objectif est de planifier **dans la continuité** du projet, pas contre lui.

### Phase 2 — Impact sur les modèles de données

Analyse si la fonctionnalité nécessite des changements en base de données :

**Questions à répondre :**
- Faut-il créer un nouveau modèle/table ? Si oui, avec quels champs et quels types ?
- Faut-il modifier un modèle existant ? Quelles colonnes ajouter/modifier/supprimer ?
- Faut-il créer de nouvelles relations (1-N, N-N) ? Avec quelles clés étrangères ?
- Faut-il des index pour les nouvelles colonnes fréquemment filtrées ?
- Une migration est-elle destructrice (suppression de colonne, changement de type) ? Si oui, signaler le risque.

**Format de sortie pour les modèles :**
```
// NOUVEAU modèle
model NomDuModele {
  id        String   @id @default(cuid())
  champ1    String
  champ2    Int?
  createdAt DateTime @default(now())
  // relation
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}

// MODIFICATION du modèle existant User
// Ajouter : profilePicture String?
// Ajouter : role           Role    @default(USER)
```

### Phase 3 — Cartographie des fichiers

Liste **exhaustive** des fichiers impactés, organisés par type d'opération :

**Créer (nouveaux fichiers) :**
- `chemin/exact/du/fichier.ts` — rôle et contenu attendu

**Modifier (fichiers existants) :**
- `chemin/exact/du/fichier.ts` — ce qui doit changer précisément (nouvelle fonction, nouvelle route, nouveau champ dans un type)

**Supprimer (si applicable) :**
- `chemin/exact/du/fichier.ts` — raison de la suppression

**Règle :** Toujours indiquer le chemin complet depuis la racine du projet. Ne jamais écrire "le fichier de service" sans préciser lequel.

### Phase 4 — Roadmap d'implémentation

Découpe le travail en étapes séquentielles, du bas vers le haut (base de données → logique métier → API → interface).

**Ordre canonique recommandé :**
1. Migrations et changements de schéma (si applicable)
2. Types et interfaces TypeScript (si applicable)
3. Logique métier / services
4. Routes API / contrôleurs
5. Composants frontend / pages
6. Tests
7. Vérification et nettoyage

Chaque étape doit être :
- **Autonome** : réalisable sans dépendre d'une étape future
- **Vérifiable** : on sait quand c'est terminé
- **Minimale** : ne pas fusionner deux étapes distinctes

## Format de sortie

```markdown
# Plan d'implémentation — [Nom de la fonctionnalité]

---

## 1. Impact sur la base de données

[Pas de changement / ou description précise des modèles créés/modifiés avec la syntaxe ORM]

⚠️ [Signaler si une migration est destructrice ou risquée]

---

## 2. Fichiers à créer

- [ ] `chemin/fichier.ts` — [rôle : ex. "Service de gestion des notifications"]
- [ ] `chemin/fichier.ts` — [rôle]

## 3. Fichiers à modifier

- [ ] `chemin/fichier.ts` — [modification : ex. "Ajouter la route POST /notifications"]
- [ ] `chemin/fichier.ts` — [modification]

## 4. Fichiers à supprimer

- [ ] `chemin/fichier.ts` — [raison]

---

## 5. Roadmap d'implémentation

### Étape 1 — [Nom de l'étape, ex: Schéma BDD]
- [ ] [Action concrète et précise]
- [ ] [Action concrète et précise]

### Étape 2 — [Nom de l'étape, ex: Couche service]
- [ ] [Action concrète et précise]
- [ ] [Action concrète et précise]

### Étape 3 — [etc.]
- [ ] [Action concrète et précise]

---

## 6. Points d'attention

- [Risque technique identifié ou décision d'architecture à valider]
- [Dépendance externe à installer si nécessaire]
- [Cas limite à gérer dès l'implémentation]

---

## 7. Définition de "terminé"

La feature est considérée complète quand :
- [ ] [Critère fonctionnel 1]
- [ ] [Critère fonctionnel 2]
- [ ] Les tests passent
- [ ] Pas de régression sur [fonctionnalité liée]
```

## Principes architecturaux à appliquer

**Modularité** — Chaque module (service, composant, route) a une responsabilité unique. Si un fichier fait plus d'une chose, proposer de le découper.

**DRY (Don't Repeat Yourself)** — Si une logique similaire existe déjà ailleurs dans le projet, la réutiliser ou l'extraire dans un utilitaire partagé.

**Robustesse** — Prévoir la gestion des erreurs dès le plan : que se passe-t-il si l'entité n'existe pas ? si la requête BDD échoue ? si l'utilisateur n'est pas autorisé ?

**Évolutivité** — Concevoir pour la prochaine feature probable, sans sur-ingénierie. Si le besoin va "probablement" évoluer dans une direction prévisible, l'architecture doit le permettre sans tout casser.

**Sécurité by design** — Identifier dès la planification les points où une validation d'entrée, un contrôle d'autorisation ou une sanitisation est nécessaire.
