// ============================================================
//  MIRAJ Recouvrement — middleware/security.js
//  Sécurité Express : Helmet, CORS, Rate Limit, Anti-Spam, Sanitization
// ============================================================

const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// ── CORS Options ─────────────────────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    // Requêtes sans Origin (ex: outils serveurs, curl, requêtes internes) acceptées
    if (!origin) return callback(null, true);

    // En environnement de développement, toutes origines acceptées
    if (!isProd) return callback(null, true);

    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://miraj-recouv.com,https://www.miraj-recouv.com')
      .split(',')
      .map(o => o.trim().toLowerCase());

    if (allowedOrigins.includes(origin.toLowerCase())) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ── Helmet Security Headers ──────────────────────────────────
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isProd ? { maxAge: 180 * 24 * 60 * 60, includeSubDomains: true } : false
});

// ── Rate Limiters ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer dans quelques minutes.' }
});

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de formulaires soumis, veuillez réessayer dans quelques minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion échouées, veuillez réessayer dans 15 minutes.' }
});

// ── Anti-Spam (Honeypot + Timestamp) ──────────────────────────
function antiSpam(req, res, next) {
  // Honeypot : si le champ 'website' est rempli par un robot
  if (req.body && req.body.website && String(req.body.website).trim() !== '') {
    return res.json({ success: true });
  }

  // Timestamp : si soumis trop rapidement (< 2500 ms après chargement page)
  if (req.body && req.body._t) {
    const timestamp = Number(req.body._t);
    if (!isNaN(timestamp) && (Date.now() - timestamp) < 2500) {
      return res.status(429).json({ error: 'Soumission trop rapide, veuillez patienter.' });
    }
  }

  next();
}

// ── Sanitization Body ─────────────────────────────────────────
function sanitizeString(key, val) {
  if (typeof val !== 'string') return val;
  // Retirer balises HTML
  let clean = val.replace(/<[^>]*>/g, '');
  // Retirer caractères de contrôle (sauf sauts de ligne et tabulations utiles)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.trim();
  const maxLen = (key === 'message') ? 4000 : 200;
  return clean.slice(0, maxLen);
}

function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(key, req.body[key]);
      }
    }
  }
  next();
}

// ── Assert Production Configuration ──────────────────────────
function assertProdConfig() {
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('❌ ERREUR CONFIG PRODUCTION : JWT_SECRET doit être défini avec au moins 32 caractères.');
      process.exit(1);
    }
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 10) {
      console.error('❌ ERREUR CONFIG PRODUCTION : ADMIN_PASSWORD doit être défini avec au moins 10 caractères.');
      process.exit(1);
    }
  }
}

module.exports = {
  corsOptions,
  securityHeaders,
  apiLimiter,
  formLimiter,
  loginLimiter,
  antiSpam,
  sanitizeBody,
  assertProdConfig
};
