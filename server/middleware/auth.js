// ============================================================
//  MIRAJ Recouvrement — middleware/auth.js
//  Vérification JWT pour les routes admin (HS256)
// ============================================================

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// Secret aléatoire généré par session de serveur si non défini en variable d'environnement
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const JWT_EXPIRY = '8h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: 'HS256' });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = authHeader.slice(7);
  try {
    req.admin = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
