// ============================================================
//  MIRAJ Recouvrement — server.js
//  Express server principal
// ============================================================

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { initDB, createDefaultAdmin } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Static files ─────────────────────────────────────────────
// Serve frontend (root)
app.use(express.static(path.join(__dirname, '..')));
// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// ── Routes API ────────────────────────────────────────────────
app.use('/api/contact',  require('./routes/contact'));
app.use('/api/download', require('./routes/download'));
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
  } catch (ex) {
    res.status(500).json({ error: ex.message });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── SPA fallback for admin ────────────────────────────────────
app.get('/admin*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
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
