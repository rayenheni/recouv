// ============================================================
//  MIRAJ Recouvrement — routes/admin.js
//  Routes protégées par JWT
// ============================================================

const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const { getDB }  = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Identifiants requis' });

  const db    = getDB();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());
  if (!admin || !bcrypt.compareSync(password, admin.password_hash))
    return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = signToken({ id: admin.id, username: admin.username });
  res.json({ token, username: admin.username });
});

// ── Toutes les routes suivantes nécessitent un JWT valide ──────
router.use(requireAuth);

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

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

// ── GET /api/admin/contacts ───────────────────────────────────
router.get('/contacts', (req, res) => {
  const db      = getDB();
  const { q, read, limit = 50, offset = 0 } = req.query;

  let sql    = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (nom LIKE ? OR email LIKE ? OR entreprise LIKE ? OR message LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (read === '0') { sql += ' AND is_read = 0'; }
  if (read === '1') { sql += ' AND is_read = 1'; }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows  = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM contacts').get().n;
  res.json({ rows, total });
});

// ── GET /api/admin/downloads ──────────────────────────────────
router.get('/downloads', (req, res) => {
  const db      = getDB();
  const { q, read, limit = 50, offset = 0 } = req.query;

  let sql    = 'SELECT * FROM downloads WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (nom LIKE ? OR email LIKE ? OR entreprise LIKE ? OR guide LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (read === '0') { sql += ' AND is_read = 0'; }
  if (read === '1') { sql += ' AND is_read = 1'; }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows  = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM downloads').get().n;
  res.json({ rows, total });
});

// ── PATCH /api/admin/contacts/:id/read ───────────────────────
router.patch('/contacts/:id/read', (req, res) => {
  const db  = getDB();
  const val = req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  db.prepare('UPDATE contacts SET is_read = ? WHERE id = ?').run(val, req.params.id);
  res.json({ success: true });
});

// ── PATCH /api/admin/downloads/:id/read ──────────────────────
router.patch('/downloads/:id/read', (req, res) => {
  const db  = getDB();
  const val = req.body.is_read !== undefined ? (req.body.is_read ? 1 : 0) : 1;
  db.prepare('UPDATE downloads SET is_read = ? WHERE id = ?').run(val, req.params.id);
  res.json({ success: true });
});

// ── DELETE /api/admin/contacts/:id ───────────────────────────
router.delete('/contacts/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── DELETE /api/admin/downloads/:id ──────────────────────────
router.delete('/downloads/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM downloads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── GET /api/admin/export/contacts (CSV) ─────────────────────
router.get('/export/contacts', (req, res) => {
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
router.get('/export/downloads', (req, res) => {
  const db   = getDB();
  const rows = db.prepare('SELECT * FROM downloads ORDER BY created_at DESC').all();

  const header = 'ID,Guide,Nom,Email,Téléphone,Fonction,Entreprise,Lu,Date\n';
  const csv    = rows.map(r =>
    [r.id, q(r.guide), q(r.nom), q(r.email), q(r.telephone), q(r.fonction), q(r.entreprise), r.is_read ? 'Oui' : 'Non', r.created_at]
    .join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="telechargenements-miraj.csv"');
  res.send('\uFEFF' + header + csv);
});

// ── POST /api/admin/change-password ──────────────────────────
router.post('/change-password', (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (min. 6 caractères)' });

  const db    = getDB();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(current, admin.password_hash))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.id);
  res.json({ success: true });
});

// ── GET /api/admin/content ────────────────────────────────────
router.get('/content', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM site_content').all();
  const content = {};
  rows.forEach(r => { content[r.key] = r.value; });
  res.json(content);
});

// ── POST /api/admin/content ───────────────────────────────────
router.post('/content', (req, res) => {
  const db = getDB();
  const stmt = db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const items = req.body;
  const updateMany = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      stmt.run(k, String(v));
    }
  });
  updateMany(items);
  res.json({ success: true });
});

// Helper CSV
function q(val) {
  if (!val) return '';
  return `"${String(val).replace(/"/g, '""')}"`;
}

module.exports = router;
