/* ============================================================= */
/* ARPGDEX Base — loads header/footer and builds nav dynamically */
/* ============================================================= */
import { NAV_ITEMS } from './nav-config.js';

const ARPGDEX_SITE = {
  title: "ARPGDEX",
  url: "https://m4ch1n4097.github.io/ARPGDEX_TEST/",
  description: "창작 종족 ARPG 관리 시스템"
};

/* ---- Build nav HTML from config ----------------------------- */
function buildNav() {
  const path = location.pathname.split('/').pop() || 'index.html';

  const dropdowns = NAV_ITEMS.map(group => `
    <li class="nav-item">
      <a href="#" style="display:flex;align-items:center;gap:.3rem;">
        ${group.label} <i class="fas fa-chevron-down" style="font-size:.5rem;"></i>
      </a>
      <div class="nav-dropdown">
        ${group.items.map(item => `
          <a href="${item.href}" class="${item.href === path ? 'active' : ''}">${item.label}</a>
        `).join('')}
      </div>
    </li>`).join('');

  return `
    <nav id="arpg-nav">
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">✦ ARPGDEX</a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
          <i class="fas fa-bars"></i>
        </button>
        <ul class="nav-links" id="navLinks">
          ${dropdowns}
        </ul>
      </div>
    </nav>`;
}

/* ---- Load includes ------------------------------------------ */
async function loadIncludes() {
  // Header: inject dynamically built nav
  const headerEls = document.querySelectorAll('[data-include="includes/header.html"]');
  headerEls.forEach(el => {
    const div = document.createElement('div');
    div.innerHTML = buildNav();
    el.replaceWith(div.firstElementChild);
  });

  // Footer: fetch as before
  const footerEls = document.querySelectorAll('[data-include="includes/footer.html"]');
  for (const el of footerEls) {
    try {
      const res = await fetch('includes/footer.html');
      const html = await res.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      el.replaceWith(div.firstElementChild);
    } catch(e) { /* skip on file:// */ }
  }

  // Mobile toggle (after nav is in DOM)
  document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
  document.querySelectorAll('#navLinks .nav-item > a').forEach(a => {
    a.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && a.nextElementSibling?.classList.contains('nav-dropdown')) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });
}

function updateMeta() {
  const title = document.title;
  if (title.includes('ARPGDEX')) {
    document.title = title.replace('ARPGDEX', ARPGDEX_SITE.title);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadIncludes();
  updateMeta();
});
