// ============================================================
//  MIRAJ Recouvrement — db.js
//  Initialisation SQLite + helpers
// ============================================================

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

// Dossier data (compatible Vercel & Netlify serverless /tmp)
const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.NOW_BUILDER);
const dataDir = isServerless ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'miraj.db');

let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
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

  // Seed default content if empty
  const count = db.prepare('SELECT COUNT(*) as n FROM site_content').get().n;
  if (count === 0) {
    const defaultContent = {
      hero_badge: "Solution Leader en Tunisie & International",
      hero_title: "Transformez Vos Créances en Trésorerie Disponibles",
      hero_subtitle: "Cabinet spécialisé dans le recouvrement de créances commercial & civil. Relance amiable, procédure judiciaire, étude de solvabilité.",
      stat_1_val: "92%",
      stat_1_lbl: "Taux de réussite amiable",
      stat_2_val: "15 000+",
      stat_2_lbl: "Dossiers traités avec succès",
      stat_3_val: "14 Jours",
      stat_3_lbl: "Délai moyen de paiement",
      contact_phone: "+216 20 309 212",
      contact_email: "info@miraj-recouv.com",
      contact_address: "62, Avenue de France, Ben Arous, Tunisie",
      about_text: "MIRAJ Recouvrement est le cabinet de référence en Tunisie dédié à la gestion globale du poste client et au recouvrement de créances stratégiques. Notre équipe d'experts juridiques et négociateurs garantit la préservation de vos relations commerciales."
    };
    const stmt = db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?)');
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
