/**
 * predev.js — exécuté automatiquement avant chaque `npm run dev`
 *
 * Problème résolu : Next.js laisse parfois un process zombie qui tient le
 * port 3000 avec un cache .next/server corrompu (chunks manquants).
 * Résultat : "Cannot find module './611.js'" → 500 sur toutes les pages.
 *
 * Ce script fait deux choses dans l'ordre :
 * 1. Libère le port 3000 (tue le process qui le tient, si présent)
 * 2. Supprime .next/server  (chunks serveur corrompus, régénérés en 3s par Next.js)
 *    ↳ .next/cache et .next/static sont conservés → recompilation rapide
 */

const { execSync } = require('child_process')
const fs            = require('fs')
const path          = require('path')

// ── 1. Libérer le port 3000 ──────────────────────────────────────────────────
try {
  require('kill-port')(3000).then(() => {
    console.log('[predev] Port 3000 libéré')
  }).catch(() => {
    // Port déjà libre — pas d'erreur
  })
} catch {
  // kill-port absent — tentative native selon la plateforme
  try {
    if (process.platform === 'win32') {
      execSync(
        'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3000\') do taskkill /F /PID %a',
        { shell: 'cmd.exe', stdio: 'ignore' }
      )
    } else {
      execSync('lsof -ti :3000 | xargs kill -9', { stdio: 'ignore' })
    }
  } catch {
    // Port déjà libre
  }
}

// ── 2. Supprimer .next/server (source des chunks corrompus) ──────────────────
const serverDir = path.join(__dirname, '..', '.next', 'server')
if (fs.existsSync(serverDir)) {
  fs.rmSync(serverDir, { recursive: true, force: true })
  console.log('[predev] .next/server nettoyé (cache serveur remis à zéro)')
} else {
  console.log('[predev] .next/server absent — rien à nettoyer')
}

console.log('[predev] ✓ Prêt — démarrage de Next.js sur le port 3000')
