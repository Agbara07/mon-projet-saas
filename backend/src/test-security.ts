// FICHIER DE TEST — à supprimer après validation du workflow
// Ce fichier contient des failles volontaires pour tester claude-code-security-review

import express from 'express';
const router = express.Router();

// FAILLE 1 : Clé API hardcodée en clair dans le code
const API_KEY = "hardcoded-api-key-do-not-do-this";
const JWT_SECRET = "jwt-secret-hardcoded-in-source";

// FAILLE 2 : Credentials base de données exposés
const DB_USER = "postgres";
const DB_PASS = "admin1234";

// FAILLE 3 : Log de données sensibles (mot de passe utilisateur visible dans les logs)
router.post('/login', (req, res) => {
  console.log("Login attempt:", req.body.email, req.body.password);
  console.log("Using secret:", JWT_SECRET);
  res.json({ token: "fake-token" });
});

// FAILLE 4 : Injection SQL — concaténation directe sans paramètre
router.get('/user', (req, res) => {
  const id = req.query.id;
  const query = `SELECT * FROM users WHERE id = ` + id;
  console.log("Query:", query);
  res.json({ query });
});

// FAILLE 5 : Route admin sans aucune vérification d'authentification
router.get('/admin/all-users', (req, res) => {
  res.json({ message: "Tous les utilisateurs — aucune auth requise !" });
});

export default router;
