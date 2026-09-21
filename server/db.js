// ============================================================
//  MIRAJ Recouvrement — db.js
//  Initialisation SQLite + helpers
// ============================================================

const JsonDatabase = require('./json-db');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.NOW_BUILDER);
const dataDir = isServerless ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

function getDB() {
  if (db) return db;
  try {
    const Sqlite = require('better-sqlite3');
    db = new Sqlite(path.join(dataDir, 'miraj.db'));
  } catch {
    console.warn('⚠️  better-sqlite3 indisponible — stockage JSON (server/data/miraj.json)');
    db = new JsonDatabase(path.join(dataDir, 'miraj.json'));
  }
  return db;
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
  {
    const defaultContent = {
      hero_badge: "— CABINET DE RECOUVREMENT — TUNISIE & INTERNATIONAL",
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
      about_text: "Cabinet de recouvrement & contentieux en Tunisie et à l'international. Honoraires 100% au résultat.",
      site_logo: "/assets/img/logo-miraj.svg",
      seo_title: "MIRAJ Recouvrement — Recouvrement de créances en Tunisie & International",
      seo_desc: "Société leader de recouvrement de créances en Tunisie. Recouvrement amiable et judiciaire, relance commerciale, études de solvabilité. Honoraires au résultat (no win, no fee). +15 ans d'expérience.",
      seo_keywords: "recouvrement de creances tunisie, recouvrement amiable tunisie, recouvrement judiciaire tunis, agence de recouvrement tunisie",
      seo_canonical: "https://miraj-recouv.com/",
      seo_geo: "Ben Arous, Tunisie (TN-13) — Lat: 36.7531, Long: 10.2189"
    };
    const stmt = db.prepare('INSERT OR IGNORE INTO site_content (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(defaultContent)) {
      stmt.run(k, v);
    }
  }

  console.log('📦  Base de données SQLite initialisée');
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

module.exports = { getDB, initDB, createDefaultAdmin };
