# 🗄️ Turso — Rendre les données du site permanentes sur Vercel

## Pourquoi ?

Sur Vercel (et Netlify), le disque du serveur est **temporaire** : la base de
données locale (`miraj.db`) est effacée à chaque redéploiement. Résultat sans
Turso : les messages du formulaire de contact, les demandes de guides et les
textes modifiés dans l'admin **disparaissent**.

[Turso](https://turso.tech) est une base **SQLite hébergée dans le cloud**,
gratuite (9 Go offerts — largement suffisant). Le code du site y est déjà
préparé : il suffit de créer la base et de renseigner 2 variables dans Vercel.
⏱️ Temps estimé : **5 minutes**.

---

## Étape 1 — Créer le compte et la base Turso (gratuit)

1. Allez sur **[turso.tech](https://turso.tech)** → **Sign Up** → connectez-vous
   avec votre compte **GitHub**.
2. Cliquez **Create Database** :
   - **Name** : `miraj` (par exemple)
   - **Location** : choisissez la région européenne la plus proche
     (ex. *Frankfurt* ou *Paris/Ireland* selon la liste proposée)
3. Cliquez sur la base créée pour voir ses informations.

## Étape 2 — Récupérer l'URL et le token

Dans la page de votre base Turso :

- **URL** : affichée en haut, format `libsql://miraj-xxxx.turso.io` → copiez-la.
- **Token** : bouton **Create Token** (ou onglet *Tokens*) → générez un token
  (expiration : *Never* / aucune, accès *Read & Write*) → copiez-le.

> 🔐 Le token est un mot de passe : ne le partagez jamais en public et ne le
> mettez jamais dans le code Git. Il ira uniquement dans Vercel (étape 3).

*(Alternative en ligne de commande, avec le CLI `turso` :
`turso db show --url miraj` et `turso db tokens create miraj`.)*

## Étape 3 — Ajouter les variables dans Vercel

Dans **Vercel → votre projet → Settings → Environment Variables**, ajoutez
(pour *Production*, *Preview* et *Development*) :

| Variable | Valeur |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://miraj-xxxx.turso.io` (étape 2) |
| `TURSO_AUTH_TOKEN` | le token copié à l'étape 2 |

Rappel — les autres variables indispensables en production (voir `.env.example`) :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | une longue chaîne aléatoire (32+ caractères) — **pas** celle de l'exemple ! |
| `ADMIN_USERNAME` | ex. `admin` |
| `ADMIN_PASSWORD` | mot de passe fort (10+ caractères, maj/min/chiffre) |
| `ALLOWED_ORIGINS` | `https://miraj-recouv.com,https://www.miraj-recouv.com` |

## Étape 4 — Redéployer et vérifier ✅

1. Vercel → **Deployments** → ⋯ sur le dernier déploiement → **Redeploy**.
2. Ouvrez **`https://votre-site/api/health`** : vous devez voir
   ```json
   {"status":"ok","time":"...","db":"turso"}
   ```
   👉 `"db":"turso"` = tout est bon, les données sont permanentes.
   (Si vous voyez `"db":"libsql-local"` ou `"json"`, les variables Turso ne
   sont pas prises en compte : vérifiez l'étape 3 puis redéployez.)
3. Test final : envoyez un message via le formulaire de contact du site,
   connectez-vous à **`/admin`** → le message est là. Redéployez encore une
   fois → il est **toujours là** 🎉

---

## 💻 En développement local

- **Sans** les variables Turso : le site utilise le fichier local
  `server/data/miraj.db` (comportement inchangé).
- **Avec** Turso en local : créez un fichier `.env` à la racine (il est
  ignoré par Git) contenant les variables, puis lancez :
  ```bash
  node --env-file=.env server/server.js
  ```

## En cas de problème

- Les logs Vercel (*Deployments → Functions*) afficheront
  `☁️ Base de données Turso (cloud) connectée` si tout va bien, ou
  `❌ Turso injoignable (...)` avec la raison (URL/token invalides…).
- Le site **ne plantera jamais** à cause de Turso : en cas d'échec de
  connexion, il repasse automatiquement sur le stockage local (temporaire)
  le temps de corriger la configuration.
