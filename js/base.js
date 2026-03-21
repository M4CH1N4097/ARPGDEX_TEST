/* ============================================================= */
/* ARPGDEX Base — loads header/footer includes and updates meta  */
/* ============================================================= */

const ARPGDEX_SITE = {
  title: "ARPGDEX",
  url: "https://your-site.github.io/arpgdex/",
  description: "A tool for organizing ARPGs and species."
};

async function loadIncludes() {
  const els = document.querySelectorAll('[data-include]');
  for (const el of els) {
    try {
      const res = await fetch(el.dataset.include);
      const html = await res.text();
      el.outerHTML = html;
    } catch(e) { /* skip on local file:// */ }
  }
  // Mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navLinks a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

function updateMeta() {
  const title = document.title;
  if (title.includes('ARPGDEX')) {
    const newTitle = title.replace('ARPGDEX', ARPGDEX_SITE.title);
    document.title = newTitle;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadIncludes();
  updateMeta();
});
