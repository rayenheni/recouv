// ============================================================
//  MIRAJ Recouvrement — db.js
//  Connexion MySQL / MariaDB (mysql2) + initialisation + helpers
// ============================================================

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool;

function getDB() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST || 'localhost',
      port:     Number(process.env.DB_PORT || 3306),
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'miraj',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      charset: 'utf8mb4',
      timezone: 'local',
      // DATETIME renvoyés comme 'YYYY-MM-DD HH:MM:SS' (même format que le front attend)
      dateStrings: true,
    });
  }
  return pool;
}

// Helper : SELECT COUNT(*) as n ... → nombre
async function count(sql, params = []) {
  const [rows] = await getDB().execute(sql, params);
  return rows.length ? Number(rows[0].n) : 0;
}

// ── Initialisation des tables ─────────────────────────────────
async function initDB() {
  const db = getDB();

  await db.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      nom        VARCHAR(200) NOT NULL,
      entreprise VARCHAR(200) NULL,
      email      VARCHAR(255) NOT NULL,
      telephone  VARCHAR(60) NULL,
      service    VARCHAR(100) NULL,
      message    TEXT NOT NULL,
      is_read    TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_contacts_created (created_at),
      KEY idx_contacts_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS downloads (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      guide      VARCHAR(100) NOT NULL,
      nom        VARCHAR(200) NOT NULL,
      telephone  VARCHAR(60) NOT NULL,
      fonction   VARCHAR(200) NOT NULL,
      entreprise VARCHAR(200) NOT NULL,
      email      VARCHAR(255) NOT NULL,
      is_read    TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_downloads_created (created_at),
      KEY idx_downloads_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      \`key\`   VARCHAR(191) PRIMARY KEY,
      \`value\` TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed default content (idempotent : ajoute aussi les nouvelles clés aux bases existantes)
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
  for (const [k, v] of Object.entries(defaultContent)) {
    await db.execute('INSERT IGNORE INTO site_content (`key`, `value`) VALUES (?, ?)', [k, v]);
  }

  console.log('📦  Base de données MySQL initialisée');
}

// ── Créer l'admin par défaut si inexistant ─────────────────────
async function createDefaultAdmin() {
  const db = getDB();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'miraj2025';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  AVERTISSEMENT : ADMIN_PASSWORD non défini. Utilisation du mot de passe par défaut. À définir impérativement en production !');
  }

  const [rows] = await db.execute('SELECT id FROM admins WHERE username = ?', [username]);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync(password, 12);
    await db.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log(`👤  Compte admin créé  →  ${username}`);
  }
}

// ── Fermeture propre du pool (tests / arrêt serveur) ───────────
async function closeDB() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}

module.exports = { getDB, count, initDB, createDefaultAdmin, closeDB };
