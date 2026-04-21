// ============================================================
//  FarmLink — Farmer Dashboard Logic (UPDATED)
// ============================================================

let allVendorProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = checkAuth('farmer');
  if (!user) return;

  setupHeader(user);

  document.getElementById('cropPhone').value = user.phone;
  document.getElementById('cropLocation').value = user.location;

  await Promise.all([loadMyCrops(), loadVendorProducts()]);
});

// Header
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

// Tabs
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`panel-${tab}`).classList.add('active');
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

// Toggle form
function togglePostForm(id) {
  const form = document.getElementById(id);
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ================= CROPS =================

async function loadMyCrops() {
  const container = document.getElementById('myCropsContainer');
  container.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading your crops…</p></div>`;

  const result = await apiRequest('/crops');

  if (!result || !result.ok) {
    container.innerHTML = `<div class="empty-state">Failed to load</div>`;
    return;
  }

  const crops = result.data.crops || [];
  renderMyCrops(crops);
}

function renderMyCrops(crops) {
  const container = document.getElementById('myCropsContainer');

  if (crops.length === 0) {
    container.innerHTML = `<div class="empty-state">No crops</div>`;
    return;
  }

  container.innerHTML = `<div class="listings-grid">${crops.map(cropCardHTML).join('')}</div>`;
}

function cropCardHTML(crop) {
  return `
    <div class="listing-card">
      <div class="card-body">
        <div>${crop.crop_name}</div>
        <div>${crop.quantity}</div>
        <div>${crop.location}</div>
      </div>
      <div class="card-footer">
        <span>Listed by You</span>
        <button onclick="deleteCrop(${crop.id}, this)">Remove</button>
      </div>
    </div>
  `;
}

// 🔥 FIXED POST (IMPORTANT)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postCropForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem('user'));

    let cropName = document.getElementById('cropName').value;
    const quantity = document.getElementById('quantity').value;
    const price_per_kg = document.getElementById('pricePerKg').value;
    const location = document.getElementById('cropLocation').value;
    const phone = document.getElementById('cropPhone').value;

    const result = await apiRequest('/crops', 'POST', {
      crop_name: cropName,
      quantity,
      price_per_kg,
      location,
      phone,
      farmer_name: user.full_name   // ✅ THIS FIX
    });

    if (!result || !result.ok) {
      alert("Error");
      return;
    }

    alert("Posted");

    form.reset();
    await loadMyCrops();
  });
});

// Delete
async function deleteCrop(id, btn) {
  btn.disabled = true;

  const result = await apiRequest(`/api/crops/${id}`, 'DELETE');

  if (!result || !result.ok) {
    alert("Delete failed");
    return;
  }

  await loadMyCrops();
}

// ================= PRODUCTS =================

async function loadVendorProducts() {
  const result = await apiRequest('/products');
  if (!result || !result.ok) return;

  allVendorProducts = result.data.products || [];
}
