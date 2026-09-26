# Audit SEO — MIRAJ Recouvrement

**Cible :** https://miraj-recouv.com/ (site one-page + back-office `/admin`)
**Date :** 26 septembre 2026
**Périmètre :** `index.html`, `style.css`, `script.js`, `robots.txt`, `sitemap.xml`, `server/` (rendu, en-têtes HTTP), `admin/`
**Méthode :** audit mené sur le serveur en exécution (`node server/server.js`), par inspection du DOM rendu, des en-têtes HTTP réels, du poids des ressources et validation du balisage (`html-validate`, parsing JSON-LD). Les métriques *lab* de Lighthouse n'ont pas pu être produites (binaire Chrome indisponible dans l'environnement) : les données de performance ci-dessous sont des mesures directes de taille, de compression et de cache, qui déterminent les Core Web Vitals.

---

## 1. Synthèse exécutive

| Axe | Note | Constat principal |
|---|---|---|
| **Technique / indexation** | 🟢 7,5/10 | Bases solides (HTML statique, canonical, sitemap, robots.txt, 404 propre). Défauts : image OG en 404, favicon absent, `/admin` non protégé côté indexation. |
| **Contenu & sémantique** | 🟠 6/10 | Bonne densité de mots-clés, mais **H1 sans le mot-clé principal** et site one-page sans maillage interne. |
| **Performance (CWV)** | 🔴 4/10 | **Aucune compression HTTP**, **aucun cache navigateur**, 2,5 Mo d'images non optimisées, polices tierces bloquantes. |
| **Données structurées** | 🟢 8/10 | Un `@graph` JSON-LD riche et valide (LegalService, WebSite, FAQPage, OfferCatalog). À aligner sur les URLs réellement existantes. |
| **Accessibilité (corrélée SEO)** | 🟠 6,5/10 | Pas de `<main>`, sliders sans `aria-label`, 11 `<button>` sans `type`. |

**Top 5 des actions à fort impact (≈ 2 h de travail) :**
1. Corriger `og:image` / `twitter:image` (actuellement **404**) → aperçus de partage cassés sur WhatsApp, LinkedIn et Facebook.
2. Activer la compression HTTP (`gzip`/`brotli`) → **−70 % de poids** sur HTML/CSS/JS.
3. Ajouter un cache long (`immutable`) sur `/assets/**` → supprime 2,5 Mo de re-téléchargement à chaque visite.
4. Réécrire le `<title>` (72 → ≤ 60 car.) et la `<meta description>` (197 → ~155 car.) pour éviter la troncature dans Google.
5. Faire entrer « recouvrement de créances en Tunisie » dans le `<h1>`.

---

## 2. Indexation & aspects techniques

### 2.1 Ce qui est déjà bien fait ✅

- HTML **statique** servi côté serveur (aucune dépendance JS pour le contenu principal) — idéal pour le crawl.
- `<html lang="fr">`, `<meta name="viewport">`, `<link rel="canonical" href="https://miraj-recouv.com/">`.
- `robots.txt` présent, sans blocage des ressources CSS/JS, avec `Disallow: /admin/` et `Disallow: /api/` + déclaration du sitemap.
- `sitemap.xml` valide (3 URLs, `lastmod`, `changefreq`, `priority`).
- Page inexistante → **HTTP 404** propre (pas de soft-404).
- En-têtes de sécurité Helmet complets (CSP, HSTS en production, `X-Content-Type-Options`, `Referrer-Policy`).
- Contenu CMS chargé en *progressive enhancement* : le HTML contient déjà le texte de repli, `fetch('/api/content')` ne fait que le rafraîchir → **aucun impact SEO**.

### 2.2 Problèmes 🔴

| # | Problème | Preuve | Impact |
|---|---|---|---|
| T1 | **`og:image` et `twitter:image` renvoient 404** | 3 références à `https://miraj-recouv.com/assets/hero-miraj.png` ; le fichier n'existe pas (`assets/` ne contient que `assets/img/`). | 🔴 Élevé — aucun visuel lors des partages WhatsApp/LinkedIn/Facebook : chute du taux de clic social. La propriété `image` du JSON-LD pointe aussi vers cette URL morte. |
| T2 | **Aucun favicon** | `/favicon.ico` → **404**, et aucune balise `<link rel="icon">` dans le `<head>`. | 🟠 Moyen — pas d'icône dans les SERP mobiles ni dans les onglets (signal de marque). |
| T3 | **`/admin` indexable** | `admin/index.html` ne contient **aucune** balise `robots`, et aucune réponse `/admin` ne porte d'en-tête `X-Robots-Tag`. Seul `robots.txt` protège. | 🟠 Moyen — une URL peut être indexée sans son contenu si elle est découverte par lien direct. |

### 2.3 Améliorations ⚠️

| # | Problème | Preuve | Recommandation |
|---|---|---|---|
| T4 | `<title>` trop long (troncature SERP) | **72 caractères** : « MIRAJ Recouvrement — Recouvrement de créances en Tunisie & International » | Viser ≤ 60 car. et placer le mot-clé en tête : `Recouvrement de créances en Tunisie \| MIRAJ Recouvrement` (56 car.). Le `&` doit aussi être échappé en `&amp;` (erreur `no-raw-characters`). |
| T5 | `<meta description>` trop longue | **197 caractères** (limite d'affichage ≈ 155–160) | Réécrire en ~155 car. avec un bénéfice + un appel à l'action. |
| T6 | `meta keywords` obsolète | 278 caractères de mots-clés (`name="keywords"`) | Sans effet depuis 2009, et potentiellement signal de spam : **à supprimer**. |
| T7 | Aucun `hreflang`, site 100 % francophone | Le JSON-LD déclare `availableLanguage: ["fr","ar","en"]`, le site n'existe qu'en français | Le marché tunisien recherche aussi en arabe. Une version `/ar/` avec `hreflang` fr/ar/x-default ouvrirait un second réservoir de trafic. |
| T8 | `sameAs` incomplet | Le JSON-LD ne liste que `https://wa.me/21620309212`, alors que le footer pointe vers LinkedIn et Facebook | Ajouter les URLs exactes LinkedIn/Facebook (cohérence d'entité = signal de marque fort pour Google). |
| T9 | Pages légales sans canonical ni Open Graph | `mentions-legales.html` et `politique-de-confidentialite.html` n'ont ni `rel="canonical"`, ni `og:*` | Ajouter canonical + OG (copy/coller du bloc existant). |
| T10 | Meta géo (`geo.region`, `geo.position`, `ICBM`) | Présentes dans le `<head>` | Google **ignore** ces balises : garder (inoffensif) mais ne pas compter sur elles. Le local SEO se joue sur la fiche **Google Business Profile** + NAP cohérent. |

---

## 3. Contenu, sémantique & mots-clés

### 3.1 Structure des titres

Bonne base : **1 seul H1**, 8 H2, 17 H3, progression logique par section.

**Problème n°1 du site : le H1 ne contient pas le mot-clé principal.**

```html
<h1>Vos impayés,<br><em>recouvrés.</em><br>Votre trésorerie,<br>protégée.</h1>
```

Le H1 est percutant commercialement, mais il ne contient ni « recouvrement », ni « créances », ni « Tunisie ». Le H1 étant le signal on-page le plus fort, il faut concilier les deux :

```html
<h1>Recouvrement de créances en Tunisie :<br>
    <em class="text-emerald-italic">vos impayés recouvrés</em>, votre trésorerie protégée.</h1>
```

Autre anomalie : les **4 `<h4>` du mega-menu** (`Études commerciales…`, `Recouvrement de créances`, `Externalisation de la relance`, `Formation & conseils juridiques`) apparaissent **avant le H1** dans le DOM, ce qui inverse la hiérarchie sémantique. Ces libellés devraient être des `<span>` stylés, pas des titres (ou au minimum des `<h2 class="visually-hidden">` absents du menu).

### 3.2 Densité & couverture (contenu visible ≈ 1 025 mots)

| Terme | Occurrences | Verdict |
|---|---|---|
| recouvrement | 40 | ✅ cœur de cible bien installé |
| amiable | 14 | ✅ |
| créances | 12 | ✅ |
| Tunisie | 11 | ✅ (mais 0 dans le H1) |
| impayés | 8 | ✅ |
| honoraires / résultat | 8 / 8 | ✅ argument différenciant bien martelé |
| judiciaire | 8 | ⚠️ à renforcer (requête forte du marché) |

Aucune sur-optimisation détectée (pas de bourrage). Les requêtes cibles secondaires (« relance commerciale », « études de solvabilité », « formation juridique ») sont couvertes dans les sections mais **sans page dédiée**.

### 3.3 Maillage interne — le point faible structurel

Le site est une **one-page** : seuls 2 liens internes réels existent (`/mentions-legales.html`, `/politique-de-confidentialite.html`) + 22 liens d'ancrage. Conséquence : impossible de se positionner sur des requêtes longue traîne concurrentielles, chacune méritant sa propre URL :

| Page à créer | Intention de recherche visée |
|---|---|
| `/recouvrement-amiable` | « recouvrement amiable tunisie », « mise en demeure impayé » |
| `/recouvrement-judiciaire` | « recouvrement judiciaire tunis », « injonction de payer Tunisie » |
| `/relance-commerciale` | « externalisation relance client », « gestion des impayés B2B » |
| `/etude-solvabilite` | « étude de solvabilité entreprise Tunisie » |
| `/formation-recouvrement` | « formation gestion du risque client » |
| `/blog/…` | contenu informationnel (le guide PDF actuel est derrière un formulaire = non indexable) |

👉 Les 3 guides actuels sont **gratuits mais protégés par formulaire** : Google ne peut pas les crawler. Publier au moins une version HTML indexable du contenu de chaque guide créerait une porte d'entrée organique majeure.

---

## 4. Performance & Core Web Vitals

### 4.1 Poids du premier chargement (mesuré sur le serveur en exécution)

| Ressource | Poids servi |
|---|---|
| `index.html` | **148 Ko** |
| CSS inline dans le `<head>` | **57 Ko** |
| `style.css` (bloquant le rendu) | **33 Ko** |
| JS inline | **21 Ko** |
| `script.js` | **12 Ko** |
| `assets/img/hero.jpg` (LCP) | **182 Ko** |
| Polices Google (2 familles, **13 graisses**) | ≈ 100–150 Ko (tierce partie) |
| **Total 1er écran** | **≈ 550–600 Ko non compressés** |
| Images du reste de la page (lazy) | **2,5 Mo au total** |

### 4.2 Problèmes 🔴

| # | Problème | Preuve | Recommandation |
|---|---|---|---|
| P1 | **Aucune compression HTTP** | Requête avec `Accept-Encoding: gzip, deflate, br` → aucun `Content-Encoding` renvoyé. `index.html` transféré en 151 801 octets bruts. | Ajouter `compression()` (Express) ou activer Brotli au niveau de l'hébergeur/Netlify/Vercel. **Gain attendu : −70 à −80 %** sur HTML/CSS/JS. |
| P2 | **Aucun cache navigateur sur les assets** | En production : `Cache-Control: public, max-age=0` sur `/assets/img/hero.jpg`. En dev : `no-store`. | Servir `/assets` avec `Cache-Control: public, max-age=31536000, immutable` + empreinte (`hero.9f3c.jpg`). Gain : 2,5 Mo économisés dès la 2ᵉ visite. |
| P3 | **Images non optimisées** | 2,5 Mo ; JPG de 180 à 235 Ko (`service-formation.jpg` 234 Ko, `why-demarche.jpg` 230 Ko) ; **0/28 images** en WebP/AVIF, **0** `srcset`, **0** `width`/`height` déclarés. | Convertir en WebP/AVIF (**−60 à −80 %**), ajouter `srcset`/`sizes`, et **toujours** `width`/`height` (ou `aspect-ratio`) pour supprimer le CLS. |
| P4 | **Chaîne de polices tierce bloquante** | 1 CSS `fonts.googleapis.com` (2 familles × 13 graisses) → puis woff2 depuis `fonts.gstatic.com` : 2 connexions tierces avant le premier pixel. `preconnect` est bien présent ✅. | Auto-héberger les woff2 (`font-display: swap`), se limiter à **3–4 graisses réellement utilisées**, ou `preload` des 2 fichiers critiques. |

### 4.3 Points d'attention ⚠️

- **CSS dupliqué et bloquant** : 57 Ko inline dans le `<head>` **+** 33 Ko de `style.css` = 90 Ko de CSS bloquant, dont la partie inline n'est jamais mise en cache. Extraire vers un fichier unique versionné et ne garder inline qu'un *critical CSS* (< 14 Ko).
- **Aucune minification** : `style.css` et `script.js` sont livrés lisibles (commentaires, indentation).
- **LCP** : `hero.jpg` a `fetchpriority="high"` ✅ mais **aucun `<link rel="preload" as="image">`** et pas de `loading="eager"` explicite. À ajouter.
- **CLS** : sans `width`/`height`, chaque image provoque un décalage au chargement (25 images en `loading="lazy"` limitent le problème plus bas dans la page).
- **Nommage d'images** : `client%20ref%201.png` (espaces dans le nom, URL-encodés, aucun mot-clé) → renommer en `logo-client-reference-1.png` ; cela vaut aussi pour l'indexation d'images (Google Images).
- **Images orphelines** : `service-etudes.jpg`, `faq.jpg` et `client ref 4.png` sont dans le dépôt mais **jamais référencées** dans la page (≈ 400 Ko inutiles).

---

## 5. Données structurées (Schema.org)

**Point fort du site** : un unique `@graph` **JSON-LD valide** (parsing vérifié) comprenant :

- `LegalService` + `ProfessionalService` avec NAP complet, `geo`, horaires d'ouverture, `priceRange`
- `ContactPoint` (langues fr/ar/en), `OfferCatalog` avec 4 `Offer`/`Service`
- `WebSite`
- `FAQPage` avec **7 paires Question/Réponse**

À corriger :

| # | Point | Détail |
|---|---|---|
| S1 | `image` / `logo` pointent vers des URLs mortes | `https://miraj-recouv.com/assets/hero-miraj.png` n'existe pas (voir T1). `logo-miraj.svg` existe ✅ (un SVG est accepté, mais un PNG ≥ 112×112 est plus robuste pour Google). |
| S2 | `FAQPage` : attentes à ajuster | Depuis août 2023, Google ne délivre le rich result FAQ qu'aux sites **gouvernementaux et de santé** reconnus. Le balisage reste utile (compréhension par les moteurs génératifs / IA), mais **ne pas en attendre un affichage enrichi**. |
| S3 | Aucun `AggregateRating` / `Review` | Volontairement absent ici : le balisage d'avis sans avis vérifiables expose à une pénalité manuelle. À n'ajouter que si de vrais témoignages clients sont publiés sur le site. |
| S4 | `sameAs` limité à WhatsApp | Voir T8. |

---

## 6. Accessibilité & qualité du code (impact indirect sur le SEO)

`html-validate` remonte **47 erreurs**, dont les plus pertinentes :

| Constat | Détail | Effet |
|---|---|---|
| Pas de landmark `<main>` | 0 occurrence de `<main>`, alors que `header`/`nav`/`footer` sont présents | 🟠 Structure de page moins lisible pour les moteurs et lecteurs d'écran |
| 11 `<button>` sans `type` | Boutons d'onglets, accordéon FAQ, menu | 🟡 Risque de soumission de formulaire parasite |
| 2 sliders sans `aria-label` | `montantSlider`, `margeSlider` (simulateur) | 🟠 Champs non nommés |
| `aria-label` mal placé (ligne 2249) | `aria-label-misuse` | 🟡 |
| 8 `<img alt="">` | Doublons des logos clients (marquee) — **acceptable** car décoratifs en doublon | ✅ |
| Numéros de téléphone avec espaces normales | `tel-non-breaking` | 🟡 Risque de coupure de ligne |
| 20+ styles inline | `no-inline-style` | 🟡 Maintenance |

✅ **Points positifs accessibilité** : 14 `<label>`, `aria-expanded` sur le menu, `aria-label` sur les icônes sociales, `title` sur les liens sortants, `rel="noopener noreferrer"` systématique, structure d'`id` d'ancrage cohérente (aucune ancre cassée — vérifié).

---

## 7. Plan d'action priorisé

### 🔴 P0 — Quick wins (≈ 2 h, gain immédiat, risque nul)

| Action | Fichier | Effort |
|---|---|---|
| Créer un visuel OG 1200×630 et corriger `og:image` + `twitter:image` (+ `image` JSON-LD) | `index.html` | 30 min |
| Ajouter favicon (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`) + `<link rel="icon">` | `index.html`, `assets/` | 20 min |
| Activer la compression : `app.use(require('compression')())` | `server/server.js` | 5 min |
| Cache long sur les assets : `express.static(..., { maxAge: '1y', immutable: true })` (ou en-têtes Netlify/Vercel) | `server/server.js`, `netlify.toml`, `vercel.json` | 15 min |
| Raccourcir `<title>` (≤ 60) et `<meta description>` (≈ 155) | `index.html` | 15 min |
| Remettre le mot-clé dans le `<h1>` | `index.html` | 10 min |
| `noindex` sur l'admin (`<meta name="robots">` + `X-Robots-Tag`) | `admin/index.html`, `server/server.js` | 10 min |
| `<link rel="preload" as="image" href="assets/img/hero.jpg" fetchpriority="high">` | `index.html` | 5 min |

**Extrait prêt à coller — `server/server.js` :**

```js
const compression = require('compression');

app.use(compression());                      // P1 : gzip/brotli
app.disable('etag');

// P2 : assets immuables (1 an de cache)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets'), {
  maxAge: '1y',
  immutable: true
}));

// T3 : l'admin ne doit jamais être indexé
app.use('/admin', (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
```

**Extrait prêt à coller — `<head>` de `index.html` :**

```html
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" as="image" href="assets/img/hero.jpg" fetchpriority="high">
<meta property="og:image" content="https://miraj-recouv.com/assets/img/og-miraj-1200x630.jpg">
<meta name="twitter:image" content="https://miraj-recouv.com/assets/img/og-miraj-1200x630.jpg">
```

### 🟠 P1 — Gain de performance et de couverture (1–2 jours)

1. Convertir les 22 images en **WebP/AVIF** + générer les `srcset` (rester < 100 Ko par visuel).
2. Ajouter `width`/`height` sur **toutes** les `<img>` (supprime le CLS).
3. **Auto-héberger les polices** et ne garder que 3–4 graisses ; `preload` des 2 fichiers critiques.
4. Extraire le CSS inline vers un fichier versionné + *critical CSS* inline ; **minifier** CSS et JS.
5. Supprimer les 3 images orphelines et renommer les fichiers `client ref N.png`.
6. Créer **5 pages filles** (amiable, judiciaire, relance, solvabilité, formation) + maillage interne depuis l'accueil.
7. **Local SEO** : revendiquer/optimiser la fiche **Google Business Profile** (Ben Arous), NAP identique partout, inscription dans les annuaires tunisiens.
8. **Google Search Console** : valider la propriété, soumettre `sitemap.xml`, surveiller les requêtes.
9. Publier une version **HTML indexable** du contenu des 3 guides téléchargeables.

### 🟡 P2 — Consolidation (long terme)

- Version **arabe** (`/ar/`) + `hreflang` fr / ar / x-default.
- Ajouter `canonical` + OG aux pages légales.
- Supprimer `meta keywords`, enrichir `sameAs`, élargir le `@graph` (pages de service, `BreadcrumbList` dès que le site devient multi-pages).
- Corriger les 47 erreurs `html-validate` (landmark `<main>`, `type` sur les `<button>`, `aria-label` des sliders).
- Mettre en place un suivi de positions + un tableau de bord de conversions (formulaire `/api/contact`, clics WhatsApp, téléchargements).

---

## 8. Ce qui est déjà excellent — à ne pas casser

- Architecture statique + CMS en *progressive enhancement* (le SEO ne dépend pas du JS).
- `@graph` JSON-LD riche, valide et cohérent avec le contenu visible.
- `robots.txt`, `sitemap.xml`, canonical, 404 : socle technique propre.
- En-têtes de sécurité Helmet complets, protection CSP et HSTS en production.
- Stratégie de mots-clés bien exécutée (honoraires au résultat, 75 % de réussite, +15 ans) : arguments différenciants présents dans les balises **et** dans le contenu.
- `preconnect` sur les domaines de polices, `loading="lazy"` sur 25 images, `fetchpriority="high"` sur le visuel héros, `rel="noopener noreferrer"` partout.

---

*Rapport généré après exécution du site en local (`node server/server.js`) et inspection des réponses HTTP réelles. Reproductible : la section « Preuves » correspond aux mesures brutes du serveur en fonctionnement.*

---

## 9. Correctifs techniques appliqués — 26/09/2026

> Aucun contenu éditorial n'a été modifié : textes, titres visibles, attributs `alt` et images affichées sont **inchangés**. Les correctifs ci-dessous portent uniquement sur les balises techniques, les en-têtes HTTP et le format des fichiers.

### 9.1 Assets créés

| Fichier | Détail |
|---|---|
| `assets/img/og-miraj.jpg` | Visuel Open Graph 1200×630 généré depuis le visuel héros existant + marque MIRAJ (corrige les 3 références mortes) |
| `assets/img/favicon.svg` + `favicon-16/32/48/180/192/512.png` | Favicons extraits du groupe `<g id="logo-mark">` du logo existant — aucun nouveau graphisme inventé |
| `assets/img/*.webp` (19 fichiers) | Versions WebP des photos et logos existants : **2 069 Ko → 735 Ko (−64 %)** |

### 9.2 `index.html`

- `<picture>` + `<source type="image/webp">` sur les **26 images bitmap** (repli JPG/PNG conservé pour les navigateurs anciens) ;
- `width` / `height` ajoutés sur les 26 images → supprime le CLS (décalage de mise en page) ;
- `<link rel="preload" as="image" href="assets/img/hero.webp" fetchpriority="high">` → LCP accéléré ;
- Favicons déclarés (SVG + 32 + 16 + apple-touch-icon 180) ;
- `og:image`, `twitter:image` et `image` (JSON-LD) pointent vers une URL qui existe désormais ;
- `<title>` : 72 → **56 caractères** ; `<meta description>` : 197 → **149 caractères** ; `meta keywords` supprimée.

### 9.3 `style.css`

- `picture { display: contents; }` : l'enveloppe `<picture>` est **neutre en mise en page**, les règles existantes (`.hero-v2-image-wrap img`, `.why-img-wrap img`, etc.) continuent de s'appliquer à l'identique.

### 9.4 `server/server.js`

- **Compression HTTP** activée (`compression`) → `index.html` 154 Ko → **32 Ko**, `style.css` 34 Ko → **6,6 Ko**, `script.js` 13 Ko → **3,7 Ko** ;
- Cache long `public, max-age=31536000, immutable` sur `/assets/**` en production (en preview : `no-store`) ;
- `X-Robots-Tag: noindex, nofollow` + `dotfiles: 'deny'` ;
- Redirection `301 /favicon.ico → /assets/img/favicon-48.png` ;
- 🔴 **Correctif de sécurité critique** : le `express.static` racine exposait **tout le dépôt**, dont `server/data/miraj.json` (hash bcrypt du mot de passe admin + données de contact = RGPD). Ces chemins renvoient désormais `404`.

### 9.5 `admin/index.html`

- `<meta name="robots" content="noindex, nofollow">` ajoutée.

### 9.6 Vérifications effectuées

| Test | Résultat |
|---|---|
| Compression (GET gzip) | ✅ −79 % sur le HTML |
| `/favicon.ico` | ✅ 301 → PNG (plus de 404) |
| `og-miraj.jpg`, `hero.webp`, logos WebP | ✅ 200 |
| `/server/data/miraj.json`, `package.json`, `*.md`, `*.py` | ✅ 404 (bloqués) |
| Site public (`/`, CSS, JS, robots, sitemap, pages légales) | ✅ 200 |
| API `POST /api/contact` et `POST /api/download` | ✅ 200 (non-régression) |
| Cache prod `/assets` | ✅ `max-age=31536000, immutable` |
| `html-validate` | 47 → 45 erreurs (title long + `&` du title corrigés) |

### 9.7 Reste à faire (non appliqué volontairement)

1. **Auto-héberger les polices** — les CDN Google sont inaccessibles depuis cet environnement ; à réaliser côté serveur de production.
2. **`srcset`/`sizes`** : variantes responsives (nécessite de générer 2–3 tailles par image).
3. **`<h1>` avec le mot-clé**, `sameAs` LinkedIn/Facebook, pages filles : ce sont des modifications de **contenu/structure**, hors du périmètre demandé.
4. **Échappement des `&`** dans le corps du HTML (2 occurrences, rendu identique).
5. **Déploiement Netlify/Vercel** : la protection `NON_PUBLIC` de `server.js` ne s'applique pas aux fichiers servis par la plateforme — publier uniquement les fichiers du site public dans ce cas.
