# Mon Projet SaaS

Stack: Next.js + Node.js/Express + PostgreSQL + Prisma

## Structure

```
mon-projet-saas/
├── frontend/          # Next.js app
├── backend/           # Node.js/Express API
├── shared/            # Types partagés
├── docker/            # Configs Docker
├── docker-compose.yml
└── .env.example
```

## Démarrage rapide

```bash
# 1. Installer les dépendances
cd frontend && npm install
cd ../backend && npm install

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Lancer avec Docker
docker-compose up -d

# 4. Migrer la base de données
cd backend && npx prisma migrate dev
```

## Fonctionnalités

- Authentification JWT (register, login, refresh token)
- Paiement Stripe (abonnements, webhooks)
- Dashboard admin
- Architecture multi-tenant
