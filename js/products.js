// ====================================================
// js/products.js — Amrani Parapharmacie
// ====================================================

// ---------- PRODUCT DATA (remplacé par Supabase plus tard) ----------
// Replace with Supabase query later
const products = [
  {
    id: 1,
    name: 'Crème Hydratante Visage',
    brand: 'La Roche-Posay',
    description: 'Crème hydratante apaisante pour peau sensible. Formulée avec de l\'eau thermale et des actifs naturels pour une hydratation durable.',
    price: 125,
    image: 'cream',
    categories: ['Skincare'],
    available: true,
  },
  {
    id: 2,
    name: 'Vitamine C + Zinc',
    brand: 'Nutri&Co',
    description: 'Complément alimentaire à base de vitamine C et de zinc pour renforcer le système immunitaire et lutter contre la fatigue.',
    price: 185,
    image: 'vitamin',
    categories: ['Vitamins'],
    available: true,
  },
  {
    id: 3,
    name: 'Shampoing Douceur',
    brand: 'Klorane',
    description: 'Shampoing doux à la camomille pour cheveux blonds et fragiles. Nettoie en douceur tout en apportant de la brillance.',
    price: 98,
    image: 'shampoo',
    categories: ['Hair Care'],
    available: false,
  },
  {
    id: 4,
    name: 'Baume Lèvres Réparateur',
    brand: 'Nuxe',
    description: 'Baume réparateur à l\'huile de tournesol et au miel pour des lèvres douces et nourries. Protection contre le froid et la sécheresse.',
    price: 65,
    image: 'lip',
    categories: ['Skincare'],
    available: true,
  },
  {
    id: 5,
    name: 'Huile de Douche Surgras',
    brand: 'Dermophil',
    description: 'Huile de douche nourrissante pour peaux sèches et sensibles. Nettoie en douceur sans agresser le film hydrolipidique.',
    price: 112,
    image: 'oil',
    categories: ['Hygiene'],
    available: true,
  },
  {
    id: 6,
    name: 'Lait Nourrissant Bébé',
    brand: 'Mustela',
    description: 'Lait corporel pour bébé, enrichi en beurre de karité et en avocat. Hydrate et protège la peau fragile des tout-petits.',
    price: 78,
    image: 'baby',
    categories: ['Baby'],
    available: true,
  },
  {
    id: 7,
    name: 'Sérum Anti-Âge',
    brand: 'Vichy',
    description: 'Sérum concentré en acide hyaluronique et en vitamine C pour atténuer les rides et redonner de l\'éclat au teint.',
    price: 245,
    image: 'cream',
    categories: ['Skincare'],
    available: true,
  },
  {
    id: 8,
    name: 'Gel Douche Fraîcheur',
    brand: 'Dove',
    description: 'Gel douche à la mousse onctueuse, enrichi en huile d\'amande douce, pour une peau douce et parfumée.',
    price: 45,
    image: 'soap',
    categories: ['Hygiene'],
    available: true,
  },
  {
    id: 9,
    name: 'Complément Oméga-3',
    brand: 'Nutri&Co',
    description: 'Complément alimentaire à base d\'oméga-3 EPA/DHA pour le maintien d\'une bonne santé cardiovasculaire et cérébrale.',
    price: 158,
    image: 'vitamin',
    categories: ['Vitamins'],
    available: false,
  },
  {
    id: 10,
    name: 'Mousse Nettoyante Bébé',
    brand: 'Mustela',
    description: 'Mousse de nettoyage très douce pour le corps et le cuir chevelu de bébé. Formule hypoallergénique.',
    price: 82,
    image: 'baby',
    categories: ['Baby'],
    available: true,
  },
  {
    id: 11,
    name: 'Masque Capillaire Réparateur',
    brand: 'Kérastase',
    description: 'Masque intensif pour cheveux abîmés. Restaure la fibre capillaire et apporte brillance et souplesse.',
    price: 210,
    image: 'shampoo',
    categories: ['Hair Care'],
    available: true,
  },
  {
    id: 12,
    name: 'Déodorant Bio',
    brand: 'Respire',
    description: 'Déodorant sans aluminium, à base de bicarbonate de sodium et d\'huiles essentielles, efficace 24h.',
    price: 55,
    image: 'soap',
    categories: ['Hygiene'],
    available: true,
  },
];

// ---------- CATEGORIES (extracted from products) ----------
function getCategories() {
  const cats = new Set();
  products.forEach(p => p.categories.forEach(c => cats.add(c)));
  return ['all', ...Array.from(cats)];
}

// ---------- RENDER FUNCTIONS ----------
function renderProducts(filteredProducts) {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  const items = filteredProducts || products;

  if (items.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = items.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="prod-icon">${getIcon(p.image)}</div>
      <h4>${p.name}</h4>
      <div class="brand">${p.brand}</div>
      <div class="price">${p.price} DH</div>
      <span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">
        ${p.available ? 'Disponible' : 'Rupture de stock'}
      </span>
      <div class="card-actions">
        <button class="btn btn-secondary btn-sm view-details" data-id="${p.id}">Voir détails</button>
      </div>
    </div>
  `).join('');

  // Attach event listeners to view details buttons
  document.querySelectorAll('.view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      const product = products.find(p => p.id === id);
      if (product) openProductModal(product);
    });
  });
}

// ---------- SVG ICON MAP ----------
function getIcon(name) {
  const icons = {
    face: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M9 15c.83.83 2 1.5 3 1.5s2.17-.67 3-1.5"/></svg>`,
    baby: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><path d="M8 16c1.6 1.6 3.5 2 5 2s3.4-.4 5-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>`,
    vitamin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8a6 6 0 0 1 6 6 6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"/><path d="M12 2v6"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/></svg>`,
    shampoo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V6z"/><path d="M10 6v2"/><path d="M14 6v2"/><path d="M8 16a4 4 0 0 0 8 0"/><path d="M6 8h12"/></svg>`,
    lip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2.8 0-5 2.2-5 5v2c0 2.8 2.2 5 5 5s5-2.2 5-5v-2c0-2.8-2.2-5-5-5z"/><path d="M8 13c0 2.2 1.8 4 4 4s4-1.8 4-4"/><path d="M8 13h8"/></svg>`,
    oil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a6 6 0 0 0-6 6c0 4 6 12 6 12s6-8 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>`,
    soap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8z"/><path d="M8 6a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.5"/><circle cx="12" cy="12" r="1"/></svg>`,
    cream: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16"/><path d="M12 4a8 8 0 0 0 0 16"/><path d="M8 8l8 8"/><path d="M16 8l-8 8"/></svg>`,
  };
  return icons[name] || icons.cream;
}

// ---------- FILTER & SEARCH ----------
function filterProducts() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
    const matchCategory = category === 'all' || p.categories.includes(category);
    return matchSearch && matchCategory;
  });

  renderProducts(filtered);
}

// ---------- POPULATE CATEGORY DROPDOWN ----------
function populateCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  const cats = getCategories();
  select.innerHTML = cats.map(c => `
    <option value="${c}">${c === 'all' ? 'Toutes les catégories' : c}</option>
  `).join('');
}

// ---------- MODAL ----------
function openProductModal(product) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <div class="modal-icon">${getIcon(product.image)}</div>
    <h2>${product.name}</h2>
    <div class="modal-brand">${product.brand}</div>
    <div class="modal-price">${product.price} DH</div>
    <div class="modal-desc">${product.description}</div>
    <div class="modal-meta">
      <span>📂 ${product.categories.join(' • ')}</span>
      <span class="badge ${product.available ? 'badge-success' : 'badge-danger'}">
        ${product.available ? 'Disponible' : 'Rupture de stock'}
      </span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="modalCloseBtn">Fermer</button>
      <button class="btn btn-primary" id="modalWhatsAppBtn">
        💬 Contacter via WhatsApp
      </button>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Close handlers
  document.getElementById('modalCloseBtn').addEventListener('click', closeProductModal);
  document.getElementById('modalWhatsAppBtn').addEventListener('click', () => {
    // Replace with actual WhatsApp number later
    const phone = '212611223344';
    const message = encodeURIComponent(`Bonjour, je souhaite plus d'informations sur le produit : ${product.name} (${product.brand})`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  });
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ---------- SETUP EVENTS ----------
function setupEvents() {
  // Search
  document.getElementById('searchInput').addEventListener('input', filterProducts);

  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', filterProducts);

  // Modal close on overlay click
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  // Modal close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });

  // Navbar mobile toggle (shared with index)
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
  populateCategoryFilter();
  renderProducts();
  setupEvents();
  console.log('✅ Products page loaded — Données samples (remplacées par Supabase plus tard)');
});