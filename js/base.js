/* ============================================================= */
/* ARPGDEX Base — nav/footer 로드 + MenuSet 시트 연동           */
/* ============================================================= */
import { ARPGDEX } from './utils.js';

const SHEET_ID = "1Sy_IFOM7aQz07_CjzEwteNy1h1IyMa1n3JGKjHqAJtM";

/* ---- 전역 메뉴 데이터 ---------------------------------------- */
export const MENU_GROUPS = [];

/* ---- MenuSet 탭 로드 ----------------------------------------- */
export async function loadMenu() {
  try {
    await ARPGDEX.loadStrings();
    const rows = await ARPGDEX.importSheet('MenuSet');
    if (!rows.length) throw new Error('empty');

    const normalize = r => ({
      id:       Number(r['id']        || 0),
      parentId: Number(r['topmenuid'] || 0),
      stringId: Number(r['menunameid']|| 0),
      link:     String(r['link']      || ''),
      hide:     ARPGDEX.toBool(r['hide'] || false),
    });

    const items = rows.map(normalize).filter(r => !r.hide && r.id);

    // 스트링 → 라벨
    items.forEach(item => {
      item.label = (item.stringId ? ARPGDEX.S(item.stringId) : '') || String(item.id);
    });

    // 상위 메뉴 (parentId === 0)
    const tops = items.filter(r => r.parentId === 0).sort((a,b) => a.id - b.id);

    // MENU_GROUPS 채우기
    MENU_GROUPS.length = 0;
    tops.forEach(top => {
      MENU_GROUPS.push({
        id:    top.id,
        label: top.label,
        link:  top.link,
        items: items
          .filter(r => r.parentId === top.id)
          .sort((a,b) => a.id - b.id)
          .map(r => ({
            id:       r.id,
            label:    r.label,
            href:     r.link || '#',
            external: !!(r.link && !r.link.endsWith('.html') && !r.link.startsWith('#') && r.link !== ''),
          }))
      });
    });

  } catch(e) {
    console.warn('[ARPGDEX] MenuSet 로드 실패, nav-config 사용:', e);
    try {
      const { NAV_ITEMS } = await import('./nav-config.js');
      MENU_GROUPS.length = 0;
      NAV_ITEMS.forEach((g, i) => {
        MENU_GROUPS.push({
          id: i+1, label: g.label, icon: g.icon || '', link: '',
          items: g.items.map((item, j) => ({
            id: j+1, label: item.label, href: item.href, external: false
          }))
        });
      });
    } catch(e2) {}
  }
}

/* ---- Nav HTML 생성 ------------------------------------------ */
function buildNav() {
  const path = location.pathname.split('/').pop() || 'index.html';

  const dropdowns = MENU_GROUPS.map(group => {
    const subItems = group.items.map(item => {
      const target = item.external ? ' target="_blank" rel="noopener"' : '';
      const active = item.href === path ? ' class="active"' : '';
      return `<a href="${item.href}"${target}${active}>${item.label}</a>`;
    }).join('');

    if (!group.items.length && group.link) {
      const ext = (!group.link.endsWith('.html') && !group.link.startsWith('#')) ? ' target="_blank" rel="noopener"' : '';
      return `<li class="nav-item"><a href="${group.link}"${ext}>${group.label}</a></li>`;
    }

    return `
      <li class="nav-item">
        <a href="#" style="display:flex;align-items:center;gap:.3rem;">
          ${group.label} <i class="fas fa-chevron-down" style="font-size:.5rem;"></i>
        </a>
        <div class="nav-dropdown">${subItems}</div>
      </li>`;
  }).join('');

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

/* ---- Favicon 로드 (MainOption!F38) --------------------------- */
async function loadFavicon() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=MainOption&range=F38`;
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cell = json?.table?.rows?.[0]?.c?.[0];
    const rawUrl = cell?.v || cell?.f || '';
    if (!rawUrl) return;
    const m = rawUrl.match(/\/d\/([\w-]+)/);
    const faviconUrl = m ? `https://drive.google.com/uc?id=${m[1]}&export=view` : rawUrl;
    let link = document.querySelector("link[rel~='icon']");
    if (link) link.href = faviconUrl;
  } catch(e) {}
}

/* ---- Includes 로드 ------------------------------------------ */
async function loadIncludes() {
  document.querySelectorAll('[data-include="includes/header.html"]').forEach(el => {
    const div = document.createElement('div');
    div.innerHTML = buildNav();
    el.replaceWith(div.firstElementChild);
  });

  for (const el of document.querySelectorAll('[data-include="includes/footer.html"]')) {
    try {
      const html = await fetch('includes/footer.html').then(r => r.text());
      const div = document.createElement('div');
      div.innerHTML = html;
      el.replaceWith(div.firstElementChild);
    } catch(e) {}
  }

  document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });
  document.querySelectorAll('#navLinks .nav-item > a').forEach(a => {
    a.addEventListener('click', e => {
      if (window.innerWidth <= 768 && a.nextElementSibling?.classList.contains('nav-dropdown')) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });
}

/* ---- DOMContentLoaded --------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();        // 메뉴 먼저 (스트링 포함)
  await loadIncludes();    // nav 렌더
  loadFavicon();           // 비동기 (기다릴 필요 없음)
});
