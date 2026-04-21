// ============================================================
//  FarmLink — Farmer Dashboard Logic
// ============================================================

// All vendor products cached for client-side filtering
let allVendorProducts = [];

// ── Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = checkAuth('farmer');
  if (!user) return;

  // Populate navbar & header
  setupHeader(user);

  // Pre-fill phone in crop form
  document.getElementById('cropPhone').value = user.phone;
  document.getElementById('cropLocation').value = user.location;

  // Load data
  await Promise.all([loadMyCrops(), loadVendorProducts()]);
});

// ── Header Setup ───────────────────────────────────────────
function setupHeader(user) {
  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  document.getElementById('navUserName').textContent = user.full_name;
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('welcomeName').textContent = `Welcome, ${user.full_name.split(' ')[0]}!`;
  document.getElementById('welcomeMeta').textContent = `${user.phone} · ${user.location}`;
}

// ── Tab Switching ───────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`panel-${tab}`).classList.add('active');
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

// ── Toggle Post Form ────────────────────────────────────────
function togglePostForm(id) {
  const form = document.getElementById(id);
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ════════════════════════════════════════════════════════════
//  SECTION 1: SELL CROPS
// ════════════════════════════════════════════════════════════

// ── Load Farmer's Own Crops ─────────────────────────────────
async function loadMyCrops() {
  const container = document.getElementById('myCropsContainer');
  container.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading your crops…</p></div>`;

  const result = await apiRequest('/crops');
  if (!result || !result.ok) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Failed to load crops</h3>
      <p>${result?.data?.error || 'Network error.'}</p>
      <button class="btn btn-outline" onclick="loadMyCrops()"><i class="fa-solid fa-rotate"></i> Retry</button>
    </div>`;
    return;
  }

  const crops = result.data.crops || [];
  updateCounters(crops.length, null);
  renderMyCrops(crops);
}

// ── Render My Crop Cards ─────────────────────────────────────
function renderMyCrops(crops) {
  const container = document.getElementById('myCropsContainer');
  document.getElementById('countMyCrops').textContent = crops.length;
  document.getElementById('statMyCrops').textContent = crops.length;

  if (crops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-wheat-awn"></i></div>
        <h3>No crops posted yet</h3>
        <p>Start by posting your first crop listing. Vendors will contact you directly!</p>
        <button class="btn btn-primary" onclick="togglePostForm('cropForm')"><i class="fa-solid fa-plus"></i> Post My First Crop</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="listings-grid">${crops.map(cropCardHTML).join('')}</div>`;
}

// ── Single Crop Card ─────────────────────────────────────────
function cropCardHTML(crop) {
  return `
    <div class="listing-card card-my-item">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <span class="card-badge badge-mine"><i class="fa-solid fa-wheat-awn"></i> My Listing</span>
        <div class="card-title">${escHtml(crop.crop_name)}</div>
        <div class="card-price">
          ${formatPrice(crop.price_per_kg)}
          <span class="price-unit">/kg</span>
        </div>
        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-box"></i></span>
            <span class="meta-label">Quantity</span>
            <span class="meta-value">${escHtml(crop.quantity)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-location-dot"></i></span>
            <span class="meta-label">Location</span>
            <span class="meta-value">${escHtml(crop.location)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-phone"></i></span>
            <span class="meta-label">Phone</span>
            <span class="meta-value">${escHtml(crop.phone)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="meta-label">Posted</span>
            <span class="meta-value">${formatDate(crop.created_at)}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-seller">Listed by <strong>You</strong></span>
        <div class="card-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteCrop(${crop.id}, this)">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>
      </div>
    </div>`;
}

// ── Post Crop Form Submit ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postCropForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    let cropName = document.getElementById('cropName').value;
    const custom = document.getElementById('cropNameCustom').value.trim();
    if (cropName === 'Other' && custom) cropName = custom;
    if (cropName === 'Other' && !custom) {
      showToast('Please enter your crop name in the Custom Crop Name field.', 'warning');
      return;
    }

    const quantity = document.getElementById('quantity').value.trim();
    const price_per_kg = document.getElementById('pricePerKg').value;
    const location = document.getElementById('cropLocation').value.trim();
    const phone = document.getElementById('cropPhone').value.trim();
    const btn = document.getElementById('submitCropBtn');

    if (!cropName || !quantity || !price_per_kg || !location || !phone) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setButtonLoading(btn, true);

    const result = await apiRequest('/crops', 'POST', { crop_name: cropName, quantity, price_per_kg, location, phone });

    setButtonLoading(btn, false, '<i class="fa-solid fa-wheat-awn"></i> Post Crop');

    if (!result || !result.ok) {
      showToast(result?.data?.error || 'Failed to post crop.', 'error');
      return;
    }

    showToast('Crop posted successfully! Vendors can now see your listing.', 'success');
    form.reset();
    // Restore defaults
    document.getElementById('cropPhone').value = getUser()?.phone || '';
    document.getElementById('cropLocation').value = getUser()?.location || '';
    togglePostForm('cropForm');
    await loadMyCrops();
  });
});

// ── Delete Crop ──────────────────────────────────────────────
async function deleteCrop(id, btn) {
  if (!confirm('Remove this crop listing? This cannot be undone.')) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  const result = await apiRequest(`/crops/${id}`, 'DELETE');

  if (!result || !result.ok) {
    showToast(result?.data?.error || 'Failed to delete crop.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove';
    return;
  }

  showToast('Crop listing removed.', 'info');
  await loadMyCrops();
}

// ════════════════════════════════════════════════════════════
//  SECTION 2: BUY FARMING SUPPLIES
// ════════════════════════════════════════════════════════════

// ── Load Vendor Products ─────────────────────────────────────
async function loadVendorProducts() {
  const container = document.getElementById('vendorProductsContainer');
  container.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading vendor products…</p></div>`;

  const result = await apiRequest('/products');
  if (!result || !result.ok) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Failed to load products</h3>
      <p>${result?.data?.error || 'Network error.'}</p>
      <button class="btn btn-outline" onclick="loadVendorProducts()"><i class="fa-solid fa-rotate"></i> Retry</button>
    </div>`;
    return;
  }

  allVendorProducts = result.data.products || [];
  document.getElementById('countProducts').textContent = allVendorProducts.length;
  document.getElementById('statVendorProducts').textContent = allVendorProducts.length;
  renderVendorProducts(allVendorProducts);
}

// ── Filter Products by Search ────────────────────────────────
function filterProducts() {
  const query = document.getElementById('productSearchInput').value.toLowerCase().trim();
  if (!query) {
    renderVendorProducts(allVendorProducts);
    return;
  }
  const filtered = allVendorProducts.filter(p =>
    p.product_name.toLowerCase().includes(query) ||
    p.vendor_name.toLowerCase().includes(query) ||
    p.location.toLowerCase().includes(query) ||
    (p.description || '').toLowerCase().includes(query)
  );
  renderVendorProducts(filtered);
}

// ── Render Vendor Product Cards ──────────────────────────────
function renderVendorProducts(products) {
  const container = document.getElementById('vendorProductsContainer');

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-store"></i></div>
        <h3>No products found</h3>
        <p>No vendor products are available right now. Check back soon!</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="listings-grid">${products.map(vendorProductCardHTML).join('')}</div>`;
}

// ── Single Vendor Product Card ───────────────────────────────
function vendorProductCardHTML(product) {
  const desc = product.description
    ? `<div class="meta-row"><span class="meta-icon"><i class="fa-solid fa-file-lines"></i></span><span class="meta-label">Details</span><span class="meta-value" style="font-size:0.82rem; font-weight:400;">${escHtml(product.description.substring(0, 80))}${product.description.length > 80 ? '…' : ''}</span></div>`
    : '';

  return `
    <div class="listing-card card-vendor">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <span class="card-badge badge-product"><i class="fa-solid fa-store"></i> Vendor Product</span>
        <div class="card-title">${escHtml(product.product_name)}</div>
        <div class="card-price">
          ${formatPrice(product.price)}
        </div>
        <div class="card-meta">
          ${desc}
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-location-dot"></i></span>
            <span class="meta-label">Location</span>
            <span class="meta-value">${escHtml(product.location)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-store"></i></span>
            <span class="meta-label">Vendor</span>
            <span class="meta-value">${escHtml(product.vendor_name)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="meta-label">Posted</span>
            <span class="meta-value">${formatDate(product.created_at)}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-seller">by <strong>${escHtml(product.vendor_name)}</strong></span>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm"
            onclick='showContactModal({
              name: "${escJs(product.vendor_name)}",
              phone: "${escJs(product.phone)}",
              role: "Vendor",
              itemName: "${escJs(product.product_name)}"
            })'>
            <i class="fa-solid fa-phone"></i> Contact
          </button>
        </div>
      </div>
    </div>`;
}

// ── Update Dashboard Counters ────────────────────────────────
function updateCounters(myCrops, products) {
  if (myCrops !== null) { document.getElementById('statMyCrops').textContent = myCrops; document.getElementById('countMyCrops').textContent = myCrops; }
  if (products !== null) { document.getElementById('statVendorProducts').textContent = products; document.getElementById('countProducts').textContent = products; }
}

// ── Helper: Escape HTML ──────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Helper: Escape JS String ─────────────────────────────────
function escJs(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
}
