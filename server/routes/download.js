// ============================================================
//  MIRAJ Recouvrement — routes/download.js
//  POST /api/download
// ============================================================

const router = require('express').Router();
const { getDB } = require('../db');

const GUIDE_LABELS = {
  amiable:     'Guide Recouvrement amiable',
  psychologie: 'Guide Psychologie du recouvrement',
  juridique:   'Guide Recouvrement juridique',
};

function validate(body) {
  const errors = [];
  if (!GUIDE_LABELS[body.guide])                         errors.push('guide invalide');
  if (!body.nom       || body.nom.trim().length < 2)     errors.push('nom requis');
  if (!body.telephone || body.telephone.trim().length < 6) errors.push('téléphone requis');
  if (!body.fonction  || body.fonction.trim().length < 2)  errors.push('fonction requise');
  if (!body.entreprise|| body.entreprise.trim().length < 2) errors.push('entreprise requise');
  if (!body.email     || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('email invalide');
  return errors;
}

router.post('/', (req, res) => {
  const { guide, nom, telephone, fonction, entreprise, email } = req.body;

  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  try {
    const db   = getDB();
    const stmt = db.prepare(`
      INSERT INTO downloads (guide, nom, telephone, fonction, entreprise, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      guide.trim(),
      nom.trim(),
      telephone.trim(),
      fonction.trim(),
      entreprise.trim(),
      email.trim().toLowerCase()
    );

    console.log(`📥  Téléchargement [#${info.lastInsertRowid}] — ${GUIDE_LABELS[guide]} par ${nom}`);
    res.json({ success: true, id: info.lastInsertRowid, guide: GUIDE_LABELS[guide] });
  } catch (err) {
    console.error('Erreur download:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
