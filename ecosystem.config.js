/**
 * PM2 Ecosystem — InvestSaaS
 *
 * Sur Windows, PM2 ne peut pas exécuter les .cmd npm directement.
 * On appelle les binaires Node.js (.js) des packages pour contourner ça.
 *
 * Commandes du quotidien :
 *   pm2 start ecosystem.config.js   ← démarre tout
 *   pm2 stop all                     ← arrête tout
 *   pm2 restart all                  ← redémarre tout
 *   pm2 logs                         ← logs temps réel
 *   pm2 monit                        ← dashboard terminal
 *   pm2 save                         ← sauvegarde la liste pour le redémarrage Windows
 */

const ROOT = 'C:/Users/HP/Desktop/mon-projet-saas'

module.exports = {
  apps: [
    // ── Frontend — Next.js dev server :3000 ──────────────────────────────────
    {
      name:        'investsaas-frontend',
      cwd:         `${ROOT}/frontend`,
      // Binaire Next.js direct (bypass npm.cmd non supporté sur Windows par PM2)
      script:      `${ROOT}/frontend/node_modules/next/dist/bin/next`,
      args:        'dev',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      // Nettoyage du cache serveur corrompu avant chaque démarrage
      post_update: [`node ${ROOT}/frontend/scripts/predev.js`],
      env: {
        NODE_ENV:          'development',
        PORT:              '3000',
        // Les variables .env.local sont lues par Next.js directement
      },
      out_file:   `${ROOT}/logs/frontend-out.log`,
      error_file: `${ROOT}/logs/frontend-err.log`,
      merge_logs: true,
    },

    // ── Backend — Express + ts-node-dev :4000 ────────────────────────────────
    {
      name:        'investsaas-backend',
      cwd:         `${ROOT}/backend`,
      // ts-node-dev direct (même raison)
      script:      `${ROOT}/backend/node_modules/ts-node-dev/lib/bin.js`,
      args:        '--respawn src/index.ts',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
        PORT:     '4000',
      },
      out_file:   `${ROOT}/logs/backend-out.log`,
      error_file: `${ROOT}/logs/backend-err.log`,
      merge_logs: true,
    },
  ],
}
