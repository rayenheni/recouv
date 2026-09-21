// ============================================================
//  MIRAJ Recouvrement — routes/admin.js
//  Routes protégées par JWT avec validation stricte
// ============================================================

const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');
const { getDB } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { loginLimiter }           = require('../middleware/security');

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({ error: 'Identifiants requis' });
  }

  const db    = getDB();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = signToken({ id: admin.id, username: admin.username });
  res.json({ token, username: admin.username });
});

// ── Toutes les routes suivantes nécessitent un JWT valide ──────
router.use(requireAuth);

function parseId(raw) {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function listAndCount(table, req, extraLikeCols) {
  const db = getDB();
  const { q, read, limit = 50, offset = 0 } = req.query;
  let limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 50;
  if (limitNum > 200) limitNum = 200;
  let offsetNum = parseInt(offset, 10);
  if (isNaN(offsetNum) || offsetNum < 0) offsetNum = 0;

  let where = ' WHERE 1=1';
  const params = [];
  if (q && typeof q === 'string' && q.trim()) {
    const like = `%${q.trim()}%`;
    where += ` AND (${extraLikeCols.map(c => `${c} LIKE ?`).join(' OR ')})`;
    extraLikeCols.forEach(() => params.push(like));
  }
  if (read === '0') where += ' AND is_read = 0';
  if (read === '1') where += ' AND is_read = 1';

  const rows = db.prepare(`SELECT * FROM ${table}${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limitNum, offsetNum);
  const total = db.prepare(`SELECT COUNT(*) as n FROM ${table}${where}`).get(...params).n;
  return { rows, total };
}

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', (_req, res) => {
  const db = getDB();
  const today = localToday();

  const stats = {
    contacts:         db.prepare("SELECT COUNT(*) as n FROM contacts").get().n,
    contacts_unread:  db.prepare("SELECT COUNT(*) as n FROM contacts WHERE is_read=0").get().n,
    contacts_today:   db.prepare("SELECT COUNT(*) as n FROM contacts WHERE created_at LIKE ?").get(`${today}%`).n,
    downloads:        db.prepare("SELECT COUNT(*) as n FROM downloads").get().n,
    downloads_unread: db.prepare("SELECT COUNT(*) as n FROM downloads WHERE is_read=0").get().n,
    downloads_today:  db.prepare("SELECT COUNT(*) as n FROM downloads WHERE created_at LIKE ?").get(`${today}%`).n,
  };
  res.json(stats);
});

router.get('/contacts', (req, res) => {
  res.json(listAndCount('contacts', req, ['nom', 'email', 'entreprise', 'message']));
});

router.get('/downloads', (req, res) => {
  res.json(listAndCount('downloads', req, ['nom', 'email', 'entreprise', 'guide']));
});

router.patch('/contacts/:id/read', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' });
  const val = req.body && req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  getDB().prepare('UPDATE contacts SET is_read = ? WHERE id = ?').run(val, id);
  res.json({ success: true });
});

router.patch('/downloads/:id/read', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' });
  const val = req.body && req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  getDB().prepare('UPDATE downloads SET is_read = ? WHERE id = ?').run(val, id);
  res.json({ success: true });
});

router.delete('/contacts/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' });
  getDB().prepare('DELETE FROM contacts WHERE id = ?').run(id);
  res.json({ success: true });
});

router.delete('/downloads/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' });
  getDB().prepare('DELETE FROM downloads WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── GET /api/admin/export/contacts (CSV) ─────────────────────
router.get('/export/contacts', (_req, res) => {
  const db   = getDB();
  const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();

  const header = 'ID,Nom,Entreprise,Email,Téléphone,Service,Message,Lu,Date\n';
  const csv    = rows.map(r =>
    [r.id, q(r.nom), q(r.entreprise), q(r.email), q(r.telephone), q(r.service), q(r.message), r.is_read ? 'Oui' : 'Non', r.created_at]
    .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="contacts-miraj.csv"');
  res.send('\uFEFF' + header + csv); // BOM pour Excel
});

// ── GET /api/admin/export/downloads (CSV) ────────────────────
router.get('/export/downloads', (_req, res) => {
  const db   = getDB();
  const rows = db.prepare('SELECT * FROM downloads ORDER BY created_at DESC').all();

  const header = 'ID,Guide,Nom,Email,Téléphone,Fonction,Entreprise,Lu,Date\n';
  const csv    = rows.map(r =>
    [r.id, q(r.guide), q(r.nom), q(r.email), q(r.telephone), q(r.fonction), q(r.entreprise), r.is_read ? 'Oui' : 'Non', r.created_at]
    .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="telechargements-miraj.csv"');
  res.send('\uFEFF' + header + csv);
});

// ── POST /api/admin/change-password ──────────────────────────
router.post('/change-password', (req, res) => {
  const { current, newPassword } = req.body || {};
  if (typeof current !== 'string' || typeof newPassword !== 'string' || !current || !newPassword) {
    return res.status(400).json({ error: 'Mots de passe requis' });
  }

  // Exigence : minimum 10 caractères + 1 majuscule + 1 minuscule + 1 chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Le mot de passe doit comporter au moins 10 caractères et contenir au moins une lettre majuscule, une lettre minuscule et un chiffre.'
    });
  }

  const db    = getDB();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!admin || !bcrypt.compareSync(current, admin.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.id);
  res.json({ success: true });
});

// ── GET /api/admin/content ────────────────────────────────────
router.get('/content', (_req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM site_content').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  res.json(content);
});

// ── POST /api/admin/content ───────────────────────────────────
router.post('/content', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Format de données invalide' });
  }

  const ALLOWED_KEYS = [
    'hero_badge',
    'hero_title',
    'hero_subtitle',
    'stat_1_val',
    'stat_1_lbl',
    'stat_2_val',
    'stat_2_lbl',
    'stat_3_val',
    'stat_3_lbl',
    'about_text',
    'contact_phone',
    'contact_email',
    'contact_whatsapp',
    'contact_address',
    'site_logo'
  ];

  const db = getDB();
  const stmt = db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');

  const updateMany = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (ALLOWED_KEYS.includes(k)) {
        const valStr = typeof v === 'string' ? v.slice(0, 2000) : String(v).slice(0, 2000);
        stmt.run(k, valStr);
      }
    }
  });

  updateMany(req.body);
  res.json({ success: true });
});

// Helper CSV
function q(val) {
  if (!val) return '';
  return `"${String(val).replace(/"/g, '""')}"`;
}

module.exports = router;
