// ============================================================
//  MIRAJ Recouvrement — server.js
//  Express server principal sécurisé
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB, createDefaultAdmin } = require('./db');
const sec     = require('./middleware/security');

// ── Vérification de la configuration de production ───────────
sec.assertProdConfig();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Configurations Express ────────────────────────────────────
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── En-têtes de sécurité & CORS ──────────────────────────────
app.use(sec.securityHeaders);
app.use(cors(sec.corsOptions));

// ── Parsing JSON limité ──────────────────────────────────────
app.use(express.json({ limit: '50kb' }));

// ── Sécurité globale sur l'API ───────────────────────────────
app.use('/api', sec.apiLimiter);
app.use('/api', sec.sanitizeBody);

// ── Static files ─────────────────────────────────────────────
// Serve frontend (root)
app.use(express.static(path.join(__dirname, '..')));
// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// ── Routes API ────────────────────────────────────────────────
app.use('/api/contact',  sec.formLimiter, sec.antiSpam, require('./routes/contact'));
app.use('/api/download', sec.formLimiter, sec.antiSpam, require('./routes/download'));
app.use('/api/admin',    require('./routes/admin'));

// ── Public site content ───────────────────────────────────────
app.get('/api/content', (_req, res) => {
  try {
    const { getDB } = require('./db');
    const db = getDB();
    const rows = db.prepare('SELECT key, value FROM site_content').all();
    const content = {};
    rows.forEach(r => { content[r.key] = r.value; });
    res.json(content);
  } catch (_ex) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── SPA fallback for admin ────────────────────────────────────
app.get('/admin*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// ── 404 pour l'API ────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// ── Error handler central ─────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Accès interdit par CORS' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Charge utile trop volumineuse' });
  }
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'Format JSON invalide' });
  }
  res.status(500).json({ error: 'Erreur serveur' });
});

// ── Start ─────────────────────────────────────────────────────
initDB();
createDefaultAdmin();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✅  Serveur MIRAJ démarré`);
    console.log(`   Site    → http://localhost:${PORT}`);
    console.log(`   Admin   → http://localhost:${PORT}/admin`);
    console.log(`   API     → http://localhost:${PORT}/api\n`);
  });
}

module.exports = app;
