// ============================================================
//  FarmLink — Shared Utilities
// ============================================================

const API_BASE = 'https://farmlink-nht1.onrender.com/api';

// ── Storage Keys ────────────────────────────────────────────
const TOKEN_KEY = 'farmlink_token';
const USER_KEY = 'farmlink_user';

// ── Auth Helpers ─────────────────────────────────────────────
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function logout() {
  clearAuth();
  showToast('Logged out successfully. See you soon!', 'info');
  setTimeout(() => { window.location.href = '/index.html'; }, 700);
}

/**
 * checkAuth — redirects to login if not authenticated.
 * @param {string} requiredType  'farmer' | 'vendor' | null
 */
function checkAuth(requiredType = null) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = '/login.html';
    return null;
  }

  if (requiredType && user.user_type !== requiredType) {
    clearAuth();
    window.location.href = '/login.html';
    return null;
  }

  return user;
}

// ── API Request ───────────────────────────────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, options);
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      clearAuth();
      window.location.href = '/login.html';
      return null;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API Error:', err);
    return { ok: false, status: 0, data: { error: 'Network error. Please check your connection.' } };
  }
}

// ── Toast Notifications ───────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '<i class="fa-solid fa-circle-info"></i>'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Button Loading State ──────────────────────────────────────
function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.origText || btn.innerHTML;
  }
}

// ── Format Date ───────────────────────────────────────────────
function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Format Currency ───────────────────────────────────────────
function formatPrice(price) {
  return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Contact Helpers ───────────────────────────────────────────
function cleanPhone(phone) {
  return phone.replace(/\D/g, '');
}

function openWhatsApp(phone, message = '') {
  const cleaned = cleanPhone(phone);
  const number = cleaned.length === 10 ? '91' + cleaned : cleaned;
  const url = message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
  window.open(url, '_blank');
}

function openPhone(phone) {
  window.open(`tel:${cleanPhone(phone)}`, '_self');
}

// ── Show Contact Modal ────────────────────────────────────────
function showContactModal({ name, phone, role, itemName }) {
  let modal = document.getElementById('contact-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'contact-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <div>
            <h3 id="cm-title">Contact</h3>
            <p id="cm-subtitle">Choose how you want to reach out</p>
          </div>
          <button class="modal-close" onclick="closeContactModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="contact-info">
            <div class="contact-icon" id="cm-icon"><i class="fa-solid fa-user"></i></div>
            <div class="contact-details">
              <strong id="cm-name"></strong>
              <span id="cm-role"></span>
            </div>
          </div>
          <div class="contact-buttons">
            <button class="btn btn-whatsapp btn-lg" id="cm-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
            </button>
            <button class="btn btn-call btn-lg" id="cm-call">
              <i class="fa-solid fa-phone"></i> Call Now
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeContactModal();
    });
  }

  document.getElementById('cm-title').textContent = `Contact ${role}`;
  document.getElementById('cm-subtitle').textContent = itemName || 'Choose how to reach out';
  document.getElementById('cm-name').textContent = name;
  document.getElementById('cm-role').innerHTML = `<i class="fa-solid fa-phone"></i> ${phone}`;
  document.getElementById('cm-icon').innerHTML = role === 'Farmer' ? '<i class="fa-solid fa-tractor"></i>' : '<i class="fa-solid fa-store"></i>';

  const waMsg = itemName
    ? `Hi, I'm interested in "${itemName}" listed on FarmLink. Can we discuss?`
    : `Hi, I found your listing on FarmLink. Can we connect?`;

  document.getElementById('cm-whatsapp').onclick = () => openWhatsApp(phone, waMsg);
  document.getElementById('cm-call').onclick = () => openPhone(phone);

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Navbar Mobile Toggle ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const menu = document.querySelector('.navbar-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }
});
