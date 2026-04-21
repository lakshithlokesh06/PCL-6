// ============================================================
//  FarmLink — Vendor Dashboard Logic
// ============================================================

// All farmer crops cached for client-side filtering
let allFarmerCrops = [];

// ── Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = checkAuth('vendor');
  if (!user) return;

  // Populate navbar & header
  setupHeader(user);

  // Pre-fill location & phone in product form
  document.getElementById('productPhone').value    = user.phone;
  document.getElementById('productLocation').value = user.location;

  // Load data
  await Promise.all([loadMyProducts(), loadFarmerCrops()]);
});

// ── Header Setup ───────────────────────────────────────────
function setupHeader(user) {
  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  document.getElementById('navUserName').textContent   = user.full_name;
  document.getElementById('userAvatar').textContent    = initials;
  document.getElementById('welcomeName').textContent   = `Welcome, ${user.full_name.split(' ')[0]}!`;
  document.getElementById('welcomeMeta').textContent   = `${user.phone} · ${user.location}`;
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

// ── Product Category → Name Suggestion ──────────────────────
function updateProductNames() {
  const cat  = document.getElementById('productCategory').value;
  const name = document.getElementById('productName');
  const unit = document.getElementById('productUnit');

  const suggestions = {
    seeds:      { placeholder: 'e.g. Hybrid Tomato Seeds, BT Cotton Seeds', unit: 'per packet' },
    fertilizer: { placeholder: 'e.g. DAP Fertilizer, Urea, NPK 10-26-26',  unit: 'per bag' },
    pesticide:  { placeholder: 'e.g. Chlorpyrifos, Mancozeb, Glyphosate',  unit: 'per litre' },
    tools:      { placeholder: 'e.g. Sprayer Pump, Sickle, Drip Kit',      unit: 'per unit' },
    irrigation: { placeholder: 'e.g. Drip Pipe, Sprinkler Set, PVC Pipe',  unit: 'per set' },
    organic:    { placeholder: 'e.g. Vermicompost, Neem Cake, Bio-Fertilizer', unit: 'per kg' },
    other:      { placeholder: 'Enter product name',                        unit: 'per unit' },
  };

  const s = suggestions[cat] || { placeholder: 'Enter product name', unit: 'per unit' };
  name.placeholder = s.placeholder;
  if (s.unit) {
    for (const opt of unit.options) {
      if (opt.value === s.unit) { unit.value = s.unit; break; }
    }
  }
}

// ════════════════════════════════════════════════════════════
//  SECTION 1: SELL MY PRODUCTS
// ════════════════════════════════════════════════════════════

// ── Load Vendor's Own Products ───────────────────────────────
async function loadMyProducts() {
  const container = document.getElementById('myProductsContainer');
  container.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading your products…</p></div>`;

  const result = await apiRequest('/products');
  if (!result || !result.ok) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Failed to load products</h3>
      <p>${result?.data?.error || 'Network error.'}</p>
      <button class="btn btn-outline" onclick="loadMyProducts()"><i class="fa-solid fa-rotate"></i> Retry</button>
    </div>`;
    return;
  }

  const products = result.data.products || [];
  document.getElementById('countMyProducts').textContent  = products.length;
  document.getElementById('statMyProducts').textContent   = products.length;
  renderMyProducts(products);
}

// ── Render My Product Cards ──────────────────────────────────
function renderMyProducts(products) {
  const container = document.getElementById('myProductsContainer');

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-store"></i></div>
        <h3>No products listed yet</h3>
        <p>Start by posting your first product. Farmers browsing FarmLink will see it instantly!</p>
        <button class="btn btn-primary" onclick="togglePostForm('productForm')"><i class="fa-solid fa-plus"></i> Post My First Product</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="listings-grid">${products.map(myProductCardHTML).join('')}</div>`;
}

// ── Single My Product Card ───────────────────────────────────
function myProductCardHTML(product) {
  const descHTML = product.description
    ? `<div class="meta-row"><span class="meta-icon"><i class="fa-solid fa-file-lines"></i></span><span class="meta-label">Details</span><span class="meta-value" style="font-size:0.82rem; font-weight:400;">${escHtml(product.description.substring(0, 100))}${product.description.length > 100 ? '…' : ''}</span></div>`
    : '';

  return `
    <div class="listing-card card-my-item">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <span class="card-badge badge-mine"><i class="fa-solid fa-store"></i> My Listing</span>
        <div class="card-title">${escHtml(product.product_name)}</div>
        <div class="card-price">${formatPrice(product.price)}</div>
        <div class="card-meta">
          ${descHTML}
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-location-dot"></i></span>
            <span class="meta-label">Location</span>
            <span class="meta-value">${escHtml(product.location)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-phone"></i></span>
            <span class="meta-label">Phone</span>
            <span class="meta-value">${escHtml(product.phone)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="meta-label">Posted</span>
            <span class="meta-value">${formatDate(product.created_at)}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-seller">Listed by <strong>You</strong></span>
        <div class="card-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id}, this)">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>
      </div>
    </div>`;
}

// ── Post Product Form Submit ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postProductForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const product_name  = document.getElementById('productName').value.trim();
    const price         = document.getElementById('productPrice').value;
    const unit          = document.getElementById('productUnit').value;
    const description   = (document.getElementById('productDescription').value.trim() || '') + (unit ? ` · ${unit}` : '');
    const location      = document.getElementById('productLocation').value.trim();
    const phone         = document.getElementById('productPhone').value.trim();
    const btn           = document.getElementById('submitProductBtn');

    if (!product_name || !price || !location || !phone) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setButtonLoading(btn, true);

    const result = await apiRequest('/products', 'POST', { product_name, price, description, location, phone });

    setButtonLoading(btn, false, '<i class="fa-solid fa-store"></i> Post Product');

    if (!result || !result.ok) {
      showToast(result?.data?.error || 'Failed to post product.', 'error');
      return;
    }

    showToast('Product posted successfully! Farmers can now see your listing.', 'success');
    form.reset();
    document.getElementById('productPhone').value    = getUser()?.phone || '';
    document.getElementById('productLocation').value = getUser()?.location || '';
    togglePostForm('productForm');
    await loadMyProducts();
  });
});

// ── Delete Product ───────────────────────────────────────────
async function deleteProduct(id, btn) {
  if (!confirm('Remove this product listing? This cannot be undone.')) return;

  btn.disabled    = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  const result = await apiRequest(`/products/${id}`, 'DELETE');

  if (!result || !result.ok) {
    showToast(result?.data?.error || 'Failed to delete product.', 'error');
    btn.disabled    = false;
    btn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove';
    return;
  }

  showToast('Product listing removed.', 'info');
  await loadMyProducts();
}

// ════════════════════════════════════════════════════════════
//  SECTION 2: BUY CROPS
// ════════════════════════════════════════════════════════════

// ── Load Farmer Crops ────────────────────────────────────────
async function loadFarmerCrops() {
  const container = document.getElementById('farmerCropsContainer');
  container.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading farmer crops…</p></div>`;

  const result = await apiRequest('/crops');
  if (!result || !result.ok) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Failed to load crops</h3>
      <p>${result?.data?.error || 'Network error.'}</p>
      <button class="btn btn-outline" onclick="loadFarmerCrops()"><i class="fa-solid fa-rotate"></i> Retry</button>
    </div>`;
    return;
  }

  allFarmerCrops = result.data.crops || [];
  document.getElementById('countCrops').textContent      = allFarmerCrops.length;
  document.getElementById('statFarmerCrops').textContent = allFarmerCrops.length;
  renderFarmerCrops(allFarmerCrops);
}

// ── Filter Crops by Search ───────────────────────────────────
function filterCrops() {
  const query = document.getElementById('cropSearchInput').value.toLowerCase().trim();
  if (!query) {
    renderFarmerCrops(allFarmerCrops);
    return;
  }
  const filtered = allFarmerCrops.filter(c =>
    c.crop_name.toLowerCase().includes(query) ||
    c.farmer_name.toLowerCase().includes(query) ||
    c.location.toLowerCase().includes(query)
  );
  renderFarmerCrops(filtered);
}

// ── Render Farmer Crop Cards ─────────────────────────────────
function renderFarmerCrops(crops) {
  const container = document.getElementById('farmerCropsContainer');

  if (crops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-wheat-awn"></i></div>
        <h3>No crops available</h3>
        <p>No farmers have posted crops yet. Check back later or try a different search.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="listings-grid">${crops.map(farmerCropCardHTML).join('')}</div>`;
}

// ── Single Farmer Crop Card ──────────────────────────────────
function farmerCropCardHTML(crop) {
  const currentUser = getUser();

  const name =
    crop.phone === currentUser.phone
      ? "Posted by you"
      : crop.farmer_name || crop.phone || "Unknown";

  return `
    <div class="listing-card card-farmer">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <span class="card-badge badge-crop"><i class="fa-solid fa-wheat-awn"></i> Fresh Crop</span>
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
            <span class="meta-icon"><i class="fa-solid fa-tractor"></i></span>
            <span class="meta-label">Farmer</span>
            <span class="meta-value">${escHtml(name)}</span>
          </div>

          <div class="meta-row">
            <span class="meta-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <span class="meta-label">Posted</span>
            <span class="meta-value">${formatDate(crop.created_at)}</span>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <span class="card-seller">by <strong>${escHtml(name)}</strong></span>

        <div class="card-actions">
          <button class="btn btn-primary btn-sm"
            onclick='showContactModal({
              name: "${escJs(name)}",
              phone: "${escJs(crop.phone)}",
              role: "Farmer",
              itemName: "${escJs(crop.crop_name)}"
            })'>
            <i class="fa-solid fa-phone"></i> Contact
          </button>
        </div>
      </div>
    </div>`;
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
