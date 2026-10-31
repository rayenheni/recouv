// ============================================================
//  MIRAJ Recouvrement — routes/admin.js
//  Routes protégées par JWT avec validation stricte
// ============================================================

const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const { getDB, count } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { loginLimiter }           = require('../middleware/security');

// Encapsule les handlers async (Express 4 ne capte pas les rejets de promesses)
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', loginLimiter, ah(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({ error: 'Identifiants requis' });
  }

  const db     = getDB();
  const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [username.trim()]);
  const admin  = rows[0];
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = signToken({ id: admin.id, username: admin.username });
  res.json({ token, username: admin.username });
}));

// ── Toutes les routes suivantes nécessitent un JWT valide ──────
router.use(requireAuth);

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', ah(async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    contacts:         await count('SELECT COUNT(*) as n FROM contacts'),
    contacts_unread:  await count('SELECT COUNT(*) as n FROM contacts WHERE is_read=0'),
    contacts_today:   await count('SELECT COUNT(*) as n FROM contacts WHERE created_at LIKE ?', [`${today}%`]),
    downloads:        await count('SELECT COUNT(*) as n FROM downloads'),
    downloads_unread: await count('SELECT COUNT(*) as n FROM downloads WHERE is_read=0'),
    downloads_today:  await count('SELECT COUNT(*) as n FROM downloads WHERE created_at LIKE ?', [`${today}%`]),
  };
  res.json(stats);
}));

// ── GET /api/admin/contacts ───────────────────────────────────
router.get('/contacts', ah(async (req, res) => {
  const db = getDB();
  const { q, read, limit = 50, offset = 0 } = req.query;

  let limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 50;
  if (limitNum > 200) limitNum = 200;

  let offsetNum = parseInt(offset, 10);
  if (isNaN(offsetNum) || offsetNum < 0) offsetNum = 0;

  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (q && typeof q === 'string') {
    sql += ' AND (nom LIKE ? OR email LIKE ? OR entreprise LIKE ? OR message LIKE ?)';
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }
  if (read === '0') { sql += ' AND is_read = 0'; }
  if (read === '1') { sql += ' AND is_read = 1'; }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  const [rows]  = await db.execute(sql, params);
  const total = await count('SELECT COUNT(*) as n FROM contacts');
  res.json({ rows, total });
}));

// ── GET /api/admin/downloads ──────────────────────────────────
router.get('/downloads', ah(async (req, res) => {
  const db = getDB();
  const { q, read, limit = 50, offset = 0 } = req.query;

  let limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 50;
  if (limitNum > 200) limitNum = 200;

  let offsetNum = parseInt(offset, 10);
  if (isNaN(offsetNum) || offsetNum < 0) offsetNum = 0;

  let sql = 'SELECT * FROM downloads WHERE 1=1';
  const params = [];

  if (q && typeof q === 'string') {
    sql += ' AND (nom LIKE ? OR email LIKE ? OR entreprise LIKE ? OR guide LIKE ?)';
    const like = `%${q.trim()}%`;
    params.push(like, like, like, like);
  }
  if (read === '0') { sql += ' AND is_read = 0'; }
  if (read === '1') { sql += ' AND is_read = 1'; }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  const [rows]  = await db.execute(sql, params);
  const total = await count('SELECT COUNT(*) as n FROM downloads');
  res.json({ rows, total });
}));

// ── PATCH /api/admin/contacts/:id/read ───────────────────────
router.patch('/contacts/:id/read', ah(async (req, res) => {
  const db  = getDB();
  const val = req.body && req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  await db.execute('UPDATE contacts SET is_read = ? WHERE id = ?', [val, req.params.id]);
  res.json({ success: true });
}));

// ── PATCH /api/admin/downloads/:id/read ──────────────────────
router.patch('/downloads/:id/read', ah(async (req, res) => {
  const db  = getDB();
  const val = req.body && req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  await db.execute('UPDATE downloads SET is_read = ? WHERE id = ?', [val, req.params.id]);
  res.json({ success: true });
}));

// ── DELETE /api/admin/contacts/:id ───────────────────────────
router.delete('/contacts/:id', ah(async (req, res) => {
  const db = getDB();
  await db.execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// ── DELETE /api/admin/downloads/:id ──────────────────────────
router.delete('/downloads/:id', ah(async (req, res) => {
  const db = getDB();
  await db.execute('DELETE FROM downloads WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// ── GET /api/admin/export/contacts (CSV) ─────────────────────
router.get('/export/contacts', ah(async (_req, res) => {
  const db      = getDB();
  const [rows]  = await db.execute('SELECT * FROM contacts ORDER BY created_at DESC');

  const header = 'ID,Nom,Entreprise,Email,Téléphone,Service,Message,Lu,Date\n';
  const csv    = rows.map(r =>
    [r.id, q(r.nom), q(r.entreprise), q(r.email), q(r.telephone), q(r.service), q(r.message), r.is_read ? 'Oui' : 'Non', r.created_at]
    .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="contacts-miraj.csv"');
  res.send('\uFEFF' + header + csv); // BOM pour Excel
}));

// ── GET /api/admin/export/downloads (CSV) ────────────────────
router.get('/export/downloads', ah(async (_req, res) => {
  const db      = getDB();
  const [rows]  = await db.execute('SELECT * FROM downloads ORDER BY created_at DESC');

  const header = 'ID,Guide,Nom,Email,Téléphone,Fonction,Entreprise,Lu,Date\n';
  const csv    = rows.map(r =>
    [r.id, q(r.guide), q(r.nom), q(r.email), q(r.telephone), q(r.fonction), q(r.entreprise), r.is_read ? 'Oui' : 'Non', r.created_at]
    .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="telechargements-miraj.csv"');
  res.send('\uFEFF' + header + csv);
}));

// ── POST /api/admin/change-password ──────────────────────────
router.post('/change-password', ah(async (req, res) => {
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

  const db     = getDB();
  const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
  const admin  = rows[0];
  if (!admin || !bcrypt.compareSync(current, admin.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  await db.execute('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, req.admin.id]);
  res.json({ success: true });
}));

// ── GET /api/admin/content ────────────────────────────────────
router.get('/content', ah(async (_req, res) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT `key`, `value` FROM site_content');
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  res.json(content);
}));

// ── POST /api/admin/content ───────────────────────────────────
router.post('/content', ah(async (req, res) => {
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
    'contact_address'
  ];

  const db = getDB();
  const upsert = 'INSERT INTO site_content (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';

  for (const [k, v] of Object.entries(req.body)) {
    if (ALLOWED_KEYS.includes(k)) {
      const valStr = typeof v === 'string' ? v.slice(0, 2000) : String(v).slice(0, 2000);
      await db.execute(upsert, [k, valStr]);
    }
  }

  res.json({ success: true });
}));

// Helper CSV
function q(val) {
  if (!val) return '';
  return `"${String(val).replace(/"/g, '""')}"`;
}

module.exports = router;
