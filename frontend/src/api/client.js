/* ── MLAMS Core JS ── */
const API = 'http://localhost:5050/api';

// ── STATE ──────────────────────────────────────────────────────────────────
const state = {
  user: null,
  token: localStorage.getItem('mlams_token'),
  currentPage: 'dashboard',
  theme: localStorage.getItem('mlams_theme') || 'light',
  leads: [],
  users: []
};

// Apply theme immediately
if (state.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// ── API CLIENT ─────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    throw e;
  }
}
// ── UTILS ──────────────────────────────────────────────────────────────────
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
// ── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── AUTH ───────────────────────────────────────────────────────────────────
async function login(email, password) {
  const data = await api('POST', '/auth/login', { email, password });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('mlams_token', data.token);
  return data.user;
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('mlams_token');
  showLogin();
}

async function checkAuth() {
  if (!state.token) return false;
  try {
    state.user = await api('GET', '/auth/me');
    return true;
  } catch {
    state.token = null;
    localStorage.removeItem('mlams_token');
    return false;
  }
}

// ── ROLE HELPERS ───────────────────────────────────────────────────────────
const roleColors = {
  admin: '#4f8ef7',
  telecaller: '#f0b429',
  counselor: '#9b59b6',
  accountant: '#1abc9c'
};
const roleLabels = {
  admin: 'Admin',
  telecaller: 'Tele-Caller',
  counselor: 'Counselor',
  accountant: 'Accountant'
};
function can(role) {
  if (!state.user) return false;
  if (Array.isArray(role)) return role.includes(state.user.role);
  return state.user.role === role || state.user.role === 'admin';
}

// ── STATUS BADGE ───────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    'New': 'new',
    'Busy': 'busy',
    'Call Back': 'callback',
    'Interested': 'interested',
    'Approved': 'approved',
    'Not Interested': 'notint',
    'Counseling Complete': 'complete',
    'Payment Received': 'paid',
    'Sitting 1 Completed': 'counseling',
    'Sitting 2 Completed': 'counseling',
    'Sitting 3 Completed': 'counseling',
    'Documents Pending': 'callback',
    'Documents Received': 'interested',
    'Follow Up': 'callback',
  };
  const cls = map[status] || 'new';
  return `<span class="badge ${cls}">${status}</span>`;
}

function stageBadge(stage) {
  const map = {
    lead: ['Lead', 'new'],
    counseling: ['Counseling', 'counseling'],
    accounts: ['Accounts', 'accounts'],
    completed: ['Completed', 'paid']
  };
  const [label, cls] = map[stage] || [stage, 'new'];
  return `<span class="badge ${cls}"><span class="stage-dot ${stage}"></span>${label}</span>`;
}

function chequeBadge(status) {
  const map = {
    'Pending': 'pending',
    'Issued': 'issued',
    'Cleared': 'cleared',
    'Bounced': 'bounced'
  };
  return `<span class="badge ${map[status] || 'pending'}">${status}</span>`;
}

// ── DATE FORMAT ────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

// ── INITIALS AVATAR ────────────────────────────────────────────────────────
function avatar(name, role) {
  const c = roleColors[role] || '#4f8ef7';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<div class="user-avatar" style="background:${c}22;color:${c};border:1px solid ${c}44">${initials}</div>`;
}

// ── MODAL HELPERS ──────────────────────────────────────────────────────────
function openModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = html;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
}

// ── MOBILE SIDEBAR ─────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !e.target.closest('.mobile-menu-btn')) {
      sidebar.classList.remove('open');
    }
  }
});

// ── SIDEBAR NAV ────────────────────────────────────────────────────────────
function getNavItems() {
  const role = state.user?.role;
  const all = [
    { id: 'dashboard', icon: '⊡', label: 'Dashboard', roles: ['admin', 'telecaller', 'counselor', 'accountant'] },
    { id: 'leads', icon: '◈', label: 'All Leads', roles: ['admin'] },
    { id: 'my-leads', icon: '◈', label: 'My Leads', roles: ['telecaller'] },
    { id: 'counseling', icon: '◉', label: 'Counseling Queue', roles: ['counselor'] },
    { id: 'accounts', icon: '◎', label: 'Accounts', roles: ['accountant', 'admin'] },
    { id: 'cheques', icon: '▣', label: 'Cheque Management', roles: ['accountant', 'admin'] },
    { id: 'users', icon: '◫', label: 'User Management', roles: ['admin'] },
    { id: 'reports', icon: '◧', label: 'Reports', roles: ['admin'] },
  ];
  return all.filter(n => n.roles.includes(role));
}

function renderSidebar(pendingCounts = {}) {
  const items = getNavItems();
  const navHtml = items.map(item => {
    const badge = pendingCounts[item.id] ? `<span class="nav-badge">${pendingCounts[item.id]}</span>` : '';
    return `<div class="nav-item ${state.currentPage === item.id ? 'active' : ''}" onclick="navigate('${item.id}')">
      <span class="icon">${item.icon}</span> ${item.label}${badge}
    </div>`;
  }).join('');

  return `
    <div class="sidebar-logo">
      <h2>MLAMS</h2>
      <span>Manpower Management</span>
    </div>
    <div class="sidebar-user">
      ${avatar(state.user.name, state.user.role)}
      <div class="sidebar-user-info">
        <strong>${state.user.name}</strong>
        <span class="role-badge">${roleLabels[state.user.role]}</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-label">Menu</div>
        ${navHtml}
      </div>
    </nav>
    <div class="sidebar-footer">
      <button class="btn-theme" onclick="toggleTheme()" title="Toggle Dark/Light Mode">
        ${state.theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button class="btn-logout" onclick="logout()">⏻ Sign Out</button>
    </div>`;
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('mlams_theme', state.theme);
  updateSidebar(); // Refresh sidebar to update toggle icon
}

function updateSidebar(pendingCounts = {}) {
  document.getElementById('sidebar').innerHTML = renderSidebar(pendingCounts);
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function navigate(page) {
  state.currentPage = page;
  updateSidebar();
  renderPage(page);
  // Close sidebar automatically on mobile when navigating
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

async function renderPage(page) {
  const content = document.getElementById('content');
  const topbarTitle = document.getElementById('topbar-title');
  const topbarActions = document.getElementById('topbar-actions');
  topbarActions.innerHTML = '';

  const titles = {
    dashboard: 'Dashboard',
    leads: 'All Leads',
    'my-leads': 'My Leads',
    counseling: 'Counseling Queue',
    accounts: 'Accounts',
    cheques: 'Cheque Management',
    users: 'User Management',
    reports: 'Reports'
  };
  topbarTitle.textContent = titles[page] || page;

  content.innerHTML = `<div class="loading-center"><div class="spinner"></div> Loading...</div>`;

  switch (page) {
    case 'dashboard':    await renderDashboard(content, topbarActions); break;
    case 'leads':        await renderLeads(content, topbarActions); break;
    case 'my-leads':     await renderMyLeads(content, topbarActions); break;
    case 'counseling':   await renderCounseling(content, topbarActions); break;
    case 'accounts':     await renderAccounts(content, topbarActions); break;
    case 'cheques':      await renderCheques(content, topbarActions); break;
    case 'users':        await renderUsers(content, topbarActions); break;
    case 'reports':      await renderReports(content, topbarActions); break;
    default:             content.innerHTML = '<p>Page not found</p>';
  }
}
