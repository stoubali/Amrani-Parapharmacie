// ====================================================
// JS/index.js — Amrani Parapharmacie
// ====================================================

// ---------- SAMPLE DATA (remplacé par Supabase plus tard) ----------
const sampleCategories = [
  { id: 1, name: 'Soins du visage', icon: 'face' },
  { id: 2, name: 'Bébé', icon: 'baby' },
  { id: 3, name: 'Vitamines', icon: 'pill' },
  { id: 4, name: 'Hygiène', icon: 'soap' },
  { id: 5, name: 'Cheveux', icon: 'hair' },
  { id: 6, name: 'Corps', icon: 'body' },
];

const sampleProducts = [
  { id: 1, name: 'Crème Hydratante', brand: 'La Roche-Posay', price: '24,90 €', available: true, icon: 'cream' },
  { id: 2, name: 'Vitamine C + Zinc', brand: 'Nutri&Co', price: '18,50 €', available: true, icon: 'vitamin' },
  { id: 3, name: 'Shampoing Douceur', brand: 'Klorane', price: '12,30 €', available: false, icon: 'shampoo' },
  { id: 4, name: 'Baume Lèvres', brand: 'Nuxe', price: '8,90 €', available: true, icon: 'lip' },
  { id: 5, name: 'Huile de Douche', brand: 'Dermophil', price: '14,20 €', available: true, icon: 'oil' },
];

const samplePromotions = [
  { id: 1, title: 'Offre Rentrée', description: '-20% sur les soins visage', icon: 'target' },
  { id: 2, title: 'Pack Bébé', description: 'Lait + Crème à prix doux', icon: 'baby' },
  { id: 3, title: 'Vitamines en promo', description: 'Achetez 2, obtenez 1 offert', icon: 'vitamin' },
];

// ---------- SVG ICON MAP ----------
const iconMap = {
  face: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><path d="M9 15c.83.83 2 1.5 3 1.5s2.17-.67 3-1.5"/></svg>`,
  baby: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><path d="M8 16c1.6 1.6 3.5 2 5 2s3.4-.4 5-2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>`,
  pill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8H8z"/><path d="M8 12a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8H8z"/><path d="M12 8v8"/><path d="M8 16h8"/></svg>`,
  soap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8z"/><path d="M8 6a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.5"/><circle cx="12" cy="12" r="1"/></svg>`,
  hair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/><path d="M12 4v16"/><path d="M4 12h16"/><path d="M8 6c1.6 1.6 2.5 3.2 2.5 6"/></svg>`,
  body: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M8 12c1.6 1.6 2 3 2 5v4h4v-4c0-2 .4-3.4 2-5"/><path d="M8 14c-2.6 0-4 1.6-4 4v2h4"/><path d="M16 14c2.6 0 4 1.6 4 4v2h-4"/></svg>`,
  cream: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16"/><path d="M12 4a8 8 0 0 0 0 16"/><path d="M8 8l8 8"/><path d="M16 8l-8 8"/></svg>`,
  vitamin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8a6 6 0 0 1 6 6 6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"/><path d="M12 2v6"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/></svg>`,
  shampoo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V6z"/><path d="M10 6v2"/><path d="M14 6v2"/><path d="M8 16a4 4 0 0 0 8 0"/><path d="M6 8h12"/></svg>`,
  lip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2.8 0-5 2.2-5 5v2c0 2.8 2.2 5 5 5s5-2.2 5-5v-2c0-2.8-2.2-5-5-5z"/><path d="M8 13c0 2.2 1.8 4 4 4s4-1.8 4-4"/><path d="M8 13h8"/></svg>`,
  oil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a6 6 0 0 0-6 6c0 4 6 12 6 12s6-8 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
};

function getIcon(name) {
  return iconMap[name] || iconMap['pill'];
}

// ---------- RENDER FUNCTIONS ----------
function loadCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = sampleCategories.map(cat => `
    <div class="category-card">
      <div class="cat-icon">${getIcon(cat.icon)}</div>
      <h4>${cat.name}</h4>
    </div>
  `).join('');
}

function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = sampleProducts.map(p => `
    <div class="product-card">
      <div class="prod-icon">${getIcon(p.icon)}</div>
      <h4>${p.name}</h4>
      <div class="brand">${p.brand}</div>
      <div class="price">${p.price}</div>
      <span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">
        ${p.available ? 'Disponible' : 'Rupture de stock'}
      </span>
    </div>
  `).join('');
}

function loadPromotions() {
  const grid = document.getElementById('promoGrid');
  if (!grid) return;
  grid.innerHTML = samplePromotions.map(promo => `
    <div class="promo-card">
      <div class="promo-icon">${getIcon(promo.icon)}</div>
      <h4>${promo.title}</h4>
      <p>${promo.description}</p>
    </div>
  `).join('');
}

// ---------- NAVIGATION (mobile menu + smooth scroll) ----------
function setupNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ---------- CONTACT FORM VALIDATION ----------
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    let isValid = true;

    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const message = document.getElementById('message');
    const nameErr = document.getElementById('nameError');
    const emailErr = document.getElementById('emailError');
    const msgErr = document.getElementById('messageError');

    [nameErr, emailErr, msgErr].forEach(el => el.textContent = '');

    if (!name.value.trim()) {
      nameErr.textContent = 'Nom requis';
      isValid = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
      emailErr.textContent = 'Email valide requis';
      isValid = false;
    }
    if (!message.value.trim()) {
      msgErr.textContent = 'Message requis';
      isValid = false;
    }

    if (isValid) {
      alert('✅ Votre message a été envoyé (simulation)');
      form.reset();
    }
  });
}

// ---------- BACK TO TOP ----------
function setupBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- SCROLL ANIMATIONS ----------
function setupAnimations() {
  const cards = document.querySelectorAll('.category-card, .product-card, .promo-card, .contact-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadProducts();
  loadPromotions();
  setupNavigation();
  setupContactForm();
  setupBackToTop();
  setupAnimations();

  console.log('✅ Amrani Parapharmacie — Données samples chargées (Supabase plus tard)');
});