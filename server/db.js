// ============================================================
//  MIRAJ Recouvrement — db.js
//  Initialisation SQLite + helpers
//
//  Ordre de priorité des moteurs de stockage :
//   1. Turso (SQLite cloud) si TURSO_DATABASE_URL est défini
//      → données PERSISTANTES, indispensable en serverless
//        (Vercel/Netlify : le disque local est temporaire !)
//   2. Fichier SQLite local via libsql (API compatible
//      better-sqlite3), sinon via better-sqlite3
//      → développement local / serveur avec disque persistant
//   3. Fichier JSON (json-db.js) en dernier recours
//
//  Tous les moteurs exposent la même API synchrone
//  (prepare/run/get/all/exec/transaction) : le reste du code
//  ne change pas quel que soit le moteur actif.
// ============================================================

const JsonDatabase = require('./json-db');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.NOW_BUILDER);
const dataDir = isServerless ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const TURSO_URL   = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let db;
let dbDriver = null; // 'turso' | 'libsql-local' | 'better-sqlite3' | 'json'

function getDB() {
  if (db) return db;

  // ── 1) Turso : base SQLite hébergée, données persistantes ───
  // Le pilote `libsql` parle directement au serveur Turso :
  // aucun fichier local n'est nécessaire, chaque requête lit/écrit
  // dans le cloud → les données survivent aux redéploiements Vercel.
  if (TURSO_URL) {
    try {
      const Database = require('libsql');
      const client = new Database(TURSO_URL, { authToken: TURSO_TOKEN || undefined });
      client.prepare('SELECT 1').get(); // échoue immédiatement si URL/token invalides
      db = client;
      dbDriver = 'turso';
      console.log('☁️   Base de données Turso (cloud) connectée — données persistantes');
      return db;
    } catch (err) {
      console.error(`❌  Turso injoignable (${err.message}) — repli sur le stockage local` +
        (isServerless ? ' (⚠️ données TEMPORAIRES sur cette plateforme !)' : ''));
    }
  }

  // ── 2) Fichier local via libsql ──────────────────────────────
  try {
    const Database = require('libsql');
    db = new Database(path.join(dataDir, 'miraj.db'));
    dbDriver = 'libsql-local';
    return db;
  } catch { /* on tente better-sqlite3 */ }

  // ── 3) Fichier local via better-sqlite3 ──────────────────────
  try {
    const Sqlite = require('better-sqlite3');
    db = new Sqlite(path.join(dataDir, 'miraj.db'));
    dbDriver = 'better-sqlite3';
    return db;
  } catch { /* repli JSON */ }

  // ── 4) Dernier recours : fichier JSON ────────────────────────
  console.warn('⚠️  Aucun moteur SQLite disponible — stockage JSON (server/data/miraj.json)');
  db = new JsonDatabase(path.join(dataDir, 'miraj.json'));
  dbDriver = 'json';
  return db;
}

// Nom du moteur actif (pour /api/health et les logs)
function getDBDriver() {
  getDB();
  return dbDriver;
}

// ── Initialisation des tables ─────────────────────────────────
function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nom         TEXT    NOT NULL,
      entreprise  TEXT,
      email       TEXT    NOT NULL,
      telephone   TEXT,
      service     TEXT,
      message     TEXT    NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guide       TEXT    NOT NULL,
      nom         TEXT    NOT NULL,
      telephone   TEXT    NOT NULL,
      fonction    TEXT    NOT NULL,
      entreprise  TEXT    NOT NULL,
      email       TEXT    NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default content (idempotent : ajoute aussi les nouvelles clés aux bases existantes)
  // Transaction unique → un seul aller-retour réseau sur Turso au démarrage.
  {
    const defaultContent = {
      hero_badge: "— CABINET DE RECOUVREMENT — ASSISTANCE JURIDIQUE",
      hero_title: "Vos impayés, recouvrés. Votre trésorerie, protégée.",
      hero_subtitle: "Nous gérons l'intégralité de vos créances — de la relance amiable à l'exécution judiciaire. Honoraires uniquement au résultat.",
      stat_1_val: "75%",
      stat_1_lbl: "Taux de recouvrement moyen",
      stat_2_val: "48h",
      stat_2_lbl: "Prise en charge des dossiers",
      stat_3_val: "+15",
      stat_3_lbl: "Années d'expérience",
      contact_phone: "+216 20 309 212",
      contact_email: "info@miraj-recouv.com",
      contact_whatsapp: "+216 20 309 212",
      contact_address: "62, Avenue de France, Ben Arous, Tunisie",
      about_text: "Cabinet de recouvrement & contentieux en Tunisie et à l'international. Honoraires 100% au résultat."
    };
    const stmt = db.prepare('INSERT OR IGNORE INTO site_content (key, value) VALUES (?, ?)');
    const seedAll = db.transaction((entries) => {
      for (const [k, v] of entries) stmt.run(k, v);
    });
    seedAll(Object.entries(defaultContent));
  }

  console.log(`📦  Base de données SQLite initialisée (moteur : ${dbDriver})`);
}

// ── Créer l'admin par défaut si inexistant ─────────────────────
function createDefaultAdmin() {
  const db = getDB();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'miraj2025';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  AVERTISSEMENT : ADMIN_PASSWORD non défini. Utilisation du mot de passe par défaut. À définir impérativement en production !');
  }

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`👤  Compte admin créé  →  ${username}`);
  }
}

module.exports = { getDB, getDBDriver, initDB, createDefaultAdmin };
