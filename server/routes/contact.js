// ============================================================
//  MIRAJ Recouvrement — routes/contact.js
//  POST /api/contact
// ============================================================

const router = require('express').Router();
const { getDB } = require('../db');

// Validation simple
function validate(body) {
  const errors = [];
  if (!body.nom    || body.nom.trim().length < 2)    errors.push('nom requis');
  if (!body.email  || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('email invalide');
  if (!body.message|| body.message.trim().length < 5) errors.push('message requis');
  return errors;
}

router.post('/', (req, res) => {
  const { nom, entreprise, email, telephone, service, message } = req.body;

  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  try {
    const db   = getDB();
    const stmt = db.prepare(`
      INSERT INTO contacts (nom, entreprise, email, telephone, service, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nom.trim(),
      (entreprise || '').trim(),
      email.trim().toLowerCase(),
      (telephone || '').trim(),
      (service || '').trim(),
      message.trim()
    );

    console.log(`📩  Nouveau contact [#${info.lastInsertRowid}] — ${nom} <${email}>`);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('Erreur contact:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
