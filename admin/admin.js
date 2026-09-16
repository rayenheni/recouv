/* ============================================================
   MIRAJ Admin — admin.js
   Frontend logic for the admin panel
   ============================================================ */

'use strict';

const API = '/api';
let token = localStorage.getItem('miraj_token');
let currentTab = 'dashboard';

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── API helper ────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// ── Format date ───────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Escape HTML ───────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Guide label ───────────────────────────────────────────────
const GUIDE_LABELS = {
  amiable:     'Recouvrement amiable',
  psychologie: 'Psychologie',
  juridique:   'Recouvrement juridique',
};
function guideLabel(g) { return GUIDE_LABELS[g] || g; }

// ============================================================
//  AUTH
// ============================================================
function showApp(username) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'grid';
  document.getElementById('topbarUser').textContent    = username || 'admin';
  initApp();
}

function showLogin() {
  token = null;
  localStorage.removeItem('miraj_token');
  document.getElementById('adminApp').style.display   = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const data = await api('/admin/login', {
      method: 'POST',
      body: { username: loginUser.value.trim(), password: loginPass.value }
    });
    token = data.token;
    localStorage.setItem('miraj_token', token);
    showApp(data.username);
  } catch (ex) {
    err.textContent   = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
});

document.getElementById('logoutBtn').addEventListener('click', showLogin);

// ============================================================
//  TAB NAVIGATION
// ============================================================
const TAB_TITLES = {
  dashboard: 'Tableau de bord',
  contacts:  'Contacts',
  downloads: 'Téléchargements',
  settings:  'Paramètres',
  seo:       'Paramètres SEO',
  content:   'Contenu du site'
};

function switchTab(tab) {
  currentTab = tab;
  // update nav
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.classList.toggle('nav-item--active', el.dataset.tab === tab);
  });
  // update content
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('is-active', el.id === `tab-${tab}`);
  });
  document.getElementById('topbarTitle').textContent = TAB_TITLES[tab] || tab;
  // load data
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'contacts')  loadContacts();
  if (tab === 'downloads') loadDownloads();
  if (tab === 'content')   loadSiteContent();
}

document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboard() {
  try {
    const s = await api('/admin/stats');
    document.getElementById('statContacts').textContent        = s.contacts;
    document.getElementById('statContactsUnread').textContent  = s.contacts_unread;
    document.getElementById('statContactsToday').textContent   = `+${s.contacts_today} aujourd'hui`;
    document.getElementById('statDownloads').textContent       = s.downloads;
    document.getElementById('statDownloadsUnread').textContent = s.downloads_unread;
    document.getElementById('statDownloadsToday').textContent  = `+${s.downloads_today} aujourd'hui`;

    // Badges
    setBadge('badgeContacts',  s.contacts_unread);
    setBadge('badgeDownloads', s.downloads_unread);

    // Recent contacts (5)
    const dc = await api('/admin/contacts?limit=5');
    document.getElementById('dashRecentContacts').innerHTML =
      dc.rows.length ? miniContactTable(dc.rows) : '<div class="empty"><div class="empty-icon">✉</div>Aucun contact</div>';

    // Recent downloads (5)
    const dd = await api('/admin/downloads?limit=5');
    document.getElementById('dashRecentDownloads').innerHTML =
      dd.rows.length ? miniDownloadTable(dd.rows) : '<div class="empty"><div class="empty-icon">↓</div>Aucun téléchargement</div>';

  } catch (ex) { console.error(ex); }
}

function setBadge(id, n) {
  const el = document.getElementById(id);
  if (n > 0) { el.textContent = n; el.style.display = 'inline-block'; }
  else        { el.style.display = 'none'; }
}

// ── Mini tables for dashboard ──────────────────────────────────
function miniContactTable(rows) {
  return `<table class="data-table">
    <thead><tr>
      <th>Nom</th><th>Email</th><th>Service</th><th>Date</th><th>Statut</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr class="${r.is_read ? '' : 'unread'}" onclick="openContact(${r.id})" title="Voir le détail">
          <td class="cell-name">${esc(r.nom)}</td>
          <td class="cell-email">${esc(r.email)}</td>
          <td>${esc(r.service) || '—'}</td>
          <td class="cell-date">${fmtDate(r.created_at)}</td>
          <td><span class="pill ${r.is_read ? 'pill--read' : 'pill--unread'}">${r.is_read ? 'Lu' : 'Nouveau'}</span></td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function miniDownloadTable(rows) {
  return `<table class="data-table">
    <thead><tr>
      <th>Nom</th><th>Email</th><th>Guide</th><th>Date</th><th>Statut</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr class="${r.is_read ? '' : 'unread'}" onclick="openDownload(${r.id})" title="Voir le détail">
          <td class="cell-name">${esc(r.nom)}</td>
          <td class="cell-email">${esc(r.email)}</td>
          <td><span class="pill pill--guide">${guideLabel(r.guide)}</span></td>
          <td class="cell-date">${fmtDate(r.created_at)}</td>
          <td><span class="pill ${r.is_read ? 'pill--read' : 'pill--unread'}">${r.is_read ? 'Lu' : 'Nouveau'}</span></td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

// ============================================================
//  CONTACTS
// ============================================================
let contactsData = [];

async function loadContacts() {
  const q    = document.getElementById('contactSearch').value;
  const read = document.getElementById('contactFilter').value;
  const container = document.getElementById('contactsTable');
  container.innerHTML = '<div class="empty">Chargement…</div>';

  try {
    const data = await api(`/admin/contacts?q=${encodeURIComponent(q)}&read=${read}&limit=100`);
    contactsData = data.rows;
    renderContactsTable(data.rows, data.total);
  } catch (ex) {
    container.innerHTML = `<div class="empty">${ex.message}</div>`;
  }
}

function renderContactsTable(rows, total) {
  const container = document.getElementById('contactsTable');
  if (!rows.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">✉</div>Aucun résultat</div>';
    return;
  }
  container.innerHTML = `
    <div class="panel">
      <div class="panel__head">
        <span style="font-size:.85rem; color:var(--text-muted);">${rows.length} / ${total} entrée(s)</span>
      </div>
      <table class="data-table">
        <thead><tr>
          <th>Nom</th><th>Entreprise</th><th>Email</th><th>Service</th><th>Message</th><th>Date</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.is_read ? '' : 'unread'}" onclick="openContact(${r.id})" title="Voir le détail">
              <td class="cell-name">${esc(r.nom)}</td>
              <td>${esc(r.entreprise) || '—'}</td>
              <td class="cell-email">${esc(r.email)}</td>
              <td>${esc(r.service) || '—'}</td>
              <td class="cell-msg">${esc(r.message)}</td>
              <td class="cell-date">${fmtDate(r.created_at)}</td>
              <td><span class="pill ${r.is_read ? 'pill--read' : 'pill--unread'}">${r.is_read ? 'Lu' : 'Nouveau'}</span></td>
              <td onclick="event.stopPropagation()">
                <div class="row-actions">
                  <button class="btn-icon btn-icon--read" title="${r.is_read ? 'Marquer non lu' : 'Marquer lu'}"
                    onclick="toggleRead('contacts',${r.id},${r.is_read})">${r.is_read ? '○' : '✓'}</button>
                  <button class="btn-icon btn-icon--danger" title="Supprimer"
                    onclick="confirmDelete('contacts',${r.id})">✕</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Search & filter listeners
document.getElementById('contactSearch').addEventListener('input', debounce(loadContacts));
document.getElementById('contactFilter').addEventListener('change', loadContacts);

// Export CSV link
document.getElementById('exportContacts').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = `${API}/admin/export/contacts?token=${token}`;
  // Use header auth instead for real download
  fetchExport('/admin/export/contacts', 'contacts-miraj.csv');
});

// ============================================================
//  DOWNLOADS
// ============================================================
let downloadsData = [];

async function loadDownloads() {
  const q    = document.getElementById('downloadSearch').value;
  const read = document.getElementById('downloadFilter').value;
  const container = document.getElementById('downloadsTable');
  container.innerHTML = '<div class="empty">Chargement…</div>';

  try {
    const data = await api(`/admin/downloads?q=${encodeURIComponent(q)}&read=${read}&limit=100`);
    downloadsData = data.rows;
    renderDownloadsTable(data.rows, data.total);
  } catch (ex) {
    container.innerHTML = `<div class="empty">${ex.message}</div>`;
  }
}

function renderDownloadsTable(rows, total) {
  const container = document.getElementById('downloadsTable');
  if (!rows.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">↓</div>Aucun résultat</div>';
    return;
  }
  container.innerHTML = `
    <div class="panel">
      <div class="panel__head">
        <span style="font-size:.85rem; color:var(--text-muted);">${rows.length} / ${total} entrée(s)</span>
      </div>
      <table class="data-table">
        <thead><tr>
          <th>Nom</th><th>Entreprise</th><th>Email</th><th>Fonction</th><th>Guide</th><th>Date</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.is_read ? '' : 'unread'}" onclick="openDownload(${r.id})" title="Voir le détail">
              <td class="cell-name">${esc(r.nom)}</td>
              <td>${esc(r.entreprise) || '—'}</td>
              <td class="cell-email">${esc(r.email)}</td>
              <td>${esc(r.fonction) || '—'}</td>
              <td><span class="pill pill--guide">${guideLabel(r.guide)}</span></td>
              <td class="cell-date">${fmtDate(r.created_at)}</td>
              <td><span class="pill ${r.is_read ? 'pill--read' : 'pill--unread'}">${r.is_read ? 'Lu' : 'Nouveau'}</span></td>
              <td onclick="event.stopPropagation()">
                <div class="row-actions">
                  <button class="btn-icon btn-icon--read" title="${r.is_read ? 'Marquer non lu' : 'Marquer lu'}"
                    onclick="toggleRead('downloads',${r.id},${r.is_read})">${r.is_read ? '○' : '✓'}</button>
                  <button class="btn-icon btn-icon--danger" title="Supprimer"
                    onclick="confirmDelete('downloads',${r.id})">✕</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

document.getElementById('downloadSearch').addEventListener('input', debounce(loadDownloads));
document.getElementById('downloadFilter').addEventListener('change', loadDownloads);
document.getElementById('exportDownloads').addEventListener('click', (e) => {
  e.preventDefault();
  fetchExport('/admin/export/downloads', 'telechargements-miraj.csv');
});

// ── CSV export via fetch (with auth header) ───────────────────
async function fetchExport(path, filename) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export échoué');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch (ex) { alert(ex.message); }
}

// ============================================================
//  READ / DELETE
// ============================================================
async function toggleRead(type, id, currentRead) {
  try {
    await api(`/admin/${type}/${id}/read`, {
      method: 'PATCH',
      body: { is_read: currentRead ? 0 : 1 }
    });
    if (currentTab === 'contacts')  loadContacts();
    else if (currentTab === 'downloads') loadDownloads();
    else loadDashboard();
    updateStats();
  } catch (ex) { alert(ex.message); }
}

let pendingDelete = null;
function confirmDelete(type, id) {
  pendingDelete = { type, id };
  document.getElementById('confirmText').textContent = `Supprimer cette entrée définitivement ?`;
  document.getElementById('confirmModal').style.display = 'flex';
}
function closeConfirm(confirmed) {
  document.getElementById('confirmModal').style.display = 'none';
  if (confirmed && pendingDelete) {
    const { type, id } = pendingDelete;
    api(`/admin/${type}/${id}`, { method: 'DELETE' }).then(() => {
      if (currentTab === 'contacts')  loadContacts();
      else if (currentTab === 'downloads') loadDownloads();
      else loadDashboard();
      updateStats();
    }).catch(ex => alert(ex.message));
  }
  pendingDelete = null;
}

// ============================================================
//  DETAIL MODALS
// ============================================================
function openContact(id) {
  const r = contactsData.find(x => x.id === id);
  if (!r) return;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-title">${esc(r.nom)}</div>
    <div class="detail-date">${fmtDate(r.created_at)}</div>
    <div class="detail-grid">
      <div class="detail-label">Email</div>      <div class="detail-value">${esc(r.email)}</div>
      <div class="detail-label">Téléphone</div>  <div class="detail-value">${esc(r.telephone) || '—'}</div>
      <div class="detail-label">Entreprise</div> <div class="detail-value">${esc(r.entreprise) || '—'}</div>
      <div class="detail-label">Service</div>    <div class="detail-value">${esc(r.service) || '—'}</div>
      <div class="detail-label detail-full">Message</div>
      <div class="detail-value detail-full" style="white-space:pre-wrap;">${esc(r.message)}</div>
    </div>
    <div class="detail-actions">
      <button class="btn btn--outline btn--sm" onclick="toggleRead('contacts',${r.id},${r.is_read}); closeDetail()">
        ${r.is_read ? '○ Marquer non lu' : '✓ Marquer lu'}
      </button>
      <button class="btn btn--sm" style="background:var(--danger);color:#fff;border-color:var(--danger);"
        onclick="closeDetail(); confirmDelete('contacts',${r.id})">✕ Supprimer</button>
    </div>`;
  document.getElementById('detailModal').style.display = 'flex';
  // auto-mark as read
  if (!r.is_read) {
    api(`/admin/contacts/${r.id}/read`, { method: 'PATCH', body: { is_read: 1 } })
      .then(() => { r.is_read = 1; updateStats(); });
  }
}

function openDownload(id) {
  const r = downloadsData.find(x => x.id === id);
  if (!r) return;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-title">${esc(r.nom)}</div>
    <div class="detail-date">${fmtDate(r.created_at)}</div>
    <div class="detail-grid">
      <div class="detail-label">Email</div>      <div class="detail-value">${esc(r.email)}</div>
      <div class="detail-label">Téléphone</div>  <div class="detail-value">${esc(r.telephone) || '—'}</div>
      <div class="detail-label">Entreprise</div> <div class="detail-value">${esc(r.entreprise) || '—'}</div>
      <div class="detail-label">Fonction</div>   <div class="detail-value">${esc(r.fonction) || '—'}</div>
      <div class="detail-label">Guide</div>
      <div class="detail-value"><span class="pill pill--guide">${guideLabel(r.guide)}</span></div>
    </div>
    <div class="detail-actions">
      <button class="btn btn--outline btn--sm" onclick="toggleRead('downloads',${r.id},${r.is_read}); closeDetail()">
        ${r.is_read ? '○ Marquer non lu' : '✓ Marquer lu'}
      </button>
      <button class="btn btn--sm" style="background:var(--danger);color:#fff;border-color:var(--danger);"
        onclick="closeDetail(); confirmDelete('downloads',${r.id})">✕ Supprimer</button>
    </div>`;
  document.getElementById('detailModal').style.display = 'flex';
  if (!r.is_read) {
    api(`/admin/downloads/${r.id}/read`, { method: 'PATCH', body: { is_read: 1 } })
      .then(() => { r.is_read = 1; updateStats(); });
  }
}

function closeDetail() {
  document.getElementById('detailModal').style.display = 'none';
  if (currentTab === 'contacts')       loadContacts();
  else if (currentTab === 'downloads') loadDownloads();
  else                                 loadDashboard();
}

// ============================================================
//  SETTINGS — change password
// ============================================================
document.getElementById('pwdForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alert  = document.getElementById('pwdAlert');
  const newPwd = document.getElementById('pwdNew').value;
  const cnf    = document.getElementById('pwdConfirm').value;
  alert.className = 'alert'; alert.style.display = 'none';

  if (newPwd !== cnf) {
    alert.className = 'alert alert--error';
    alert.textContent = 'Les mots de passe ne correspondent pas.';
    alert.style.display = 'block';
    return;
  }
  try {
    await api('/admin/change-password', {
      method: 'POST',
      body: { current: document.getElementById('pwdCurrent').value, newPassword: newPwd }
    });
    alert.className   = 'alert alert--success';
    alert.textContent = '✓ Mot de passe modifié avec succès.';
    alert.style.display = 'block';
    e.target.reset();
  } catch (ex) {
    alert.className   = 'alert alert--error';
    alert.textContent = ex.message;
    alert.style.display = 'block';
  }
});

// ============================================================
//  SEO PARAMETERS
// ============================================================
const seoForm = document.getElementById('seoForm');
if (seoForm) {
  seoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alert = document.getElementById('seoAlert');
    if (alert) {
      alert.className = 'alert alert--success';
      alert.textContent = '✓ Les paramètres SEO ont été sauvegardés et mis à jour avec succès.';
      alert.style.display = 'block';
      setTimeout(() => { alert.style.display = 'none'; }, 5000);
    }
  });
}

// ============================================================
//  SITE CONTENT CMS
// ============================================================
async function loadSiteContent() {
  try {
    const content = await api('/admin/content');
    for (const [key, val] of Object.entries(content)) {
      const field = document.getElementById(`cms_${key}`);
      if (field) field.value = val;
    }
  } catch (ex) {
    console.error('Erreur chargement contenu:', ex);
  }
}

const siteContentForm = document.getElementById('siteContentForm');
if (siteContentForm) {
  siteContentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = document.getElementById('contentAlert');
    if (alert) alert.style.display = 'none';
    
    const formData = new FormData(siteContentForm);
    const payload = {};
    formData.forEach((val, key) => { payload[key] = val; });

    try {
      await api('/admin/content', {
        method: 'POST',
        body: payload
      });
      if (alert) {
        alert.className = 'alert alert--success';
        alert.textContent = '✓ Contenu du site web mis à jour et publié avec succès !';
        alert.style.display = 'block';
        setTimeout(() => { alert.style.display = 'none'; }, 5000);
      }
    } catch (ex) {
      if (alert) {
        alert.className = 'alert alert--error';
        alert.textContent = ex.message || 'Erreur lors de la mise à jour';
        alert.style.display = 'block';
      }
    }
  });
}

// ============================================================
//  STATS REFRESH (lightweight)
// ============================================================
async function updateStats() {
  try {
    const s = await api('/admin/stats');
    setBadge('badgeContacts',  s.contacts_unread);
    setBadge('badgeDownloads', s.downloads_unread);
    if (currentTab === 'dashboard') {
      document.getElementById('statContactsUnread').textContent  = s.contacts_unread;
      document.getElementById('statDownloadsUnread').textContent = s.downloads_unread;
    }
  } catch {}
}

// ============================================================
//  INIT
// ============================================================
function initApp() {
  switchTab('dashboard');
  // Auto-refresh stats every 60s
  setInterval(updateStats, 60000);
}

// ── Check if already logged in ────────────────────────────────
(async () => {
  if (token) {
    try {
      await api('/admin/stats'); // verify token validity
      const u = JSON.parse(atob(token.split('.')[1]));
      showApp(u.username);
    } catch {
      showLogin();
    }
  }
})();
