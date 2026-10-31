# MIRAJ Recouvrement — Website & Admin CRM/CMS

Site vitrine + API Express + panneau admin. Base de données : **MySQL / MariaDB**.

## Prérequis

- Node.js 18+ (24 recommandé)
- MySQL 8 ou MariaDB 10.5+

## Installation locale

```bash
# 1. Créer la base de données
mysql -u root -p -e "CREATE DATABASE miraj CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Dépendances
npm install

# 3. Configuration
cp .env.example .env
# → renseigner DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
#   JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, ALLOWED_ORIGINS

# 4. Démarrage (les tables sont créées automatiquement)
npm start
```

- Site : http://localhost:3000
- Admin : http://localhost:3000/admin
- API : http://localhost:3000/api

## Déploiement cPanel (Oxahost)

1. **Bases de données MySQL** → créer la base + l'utilisateur, associer avec tous les privilèges
   (les noms sont préfixés, ex. `cpaneluser_miraj`).
2. **Setup Node.js App** → version 18+, mode Production, fichier de démarrage `server/server.js`.
3. Uploader le code, `npm install --omit=dev`.
4. Renseigner les variables d'environnement (`DB_*`, `JWT_SECRET`, `ADMIN_*`, `ALLOWED_ORIGINS`).
5. Redémarrer l'app, vérifier `/api/health` puis `/admin`.

Aucune migration manuelle : les tables `contacts`, `downloads`, `admins`
et `site_content` sont créées au premier démarrage.
