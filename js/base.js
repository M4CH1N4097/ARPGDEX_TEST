/* ============================================================= */
/* ARPGDEX Base — nav/footer 로드 + MenuSet 시트 연동           */
/* ============================================================= */
import { ARPGDEX } from './utils.js';

const SHEET_ID = "1Sy_IFOM7aQz07_CjzEwteNy1h1IyMa1n3JGKjHqAJtM";

/* ---- 전역 데이터 -------------------------------------------- */
export const MENU_GROUPS = [];
export const SITE_CONFIG = { name: 'ARPGDEX', sub: '', heroImage: '', discordLink: '' };

/* ---- sessionStorage 헬퍼 (버전 키로 캐시 자동 무효화) ------- */
const CACHE_VER = 'v5';
const cache = {
  get: (key) => { try { const v = sessionStorage.getItem(CACHE_VER + key); return v ? JSON.parse(v) : null; } catch(e) { return null; } },
  set: (key, val) => { try { sessionStorage.setItem(CACHE_VER + key, JSON.stringify(val)); } catch(e) {} },
};

/* ---- MenuSet 탭 로드 ---------------------------------------- */
export async function loadMenu() {
  const cached = cache.get('arpgdex_menu');
  if (cached) {
    MENU_GROUPS.length = 0;
    cached.forEach(g => MENU_GROUPS.push(g));
    return;
  }

  try {
    await ARPGDEX.loadStrings();
    const rows = await ARPGDEX.importSheet('MenuSet');
    if (!rows.length) throw new Error('empty');

    const items = rows
      .map(r => ({
        id:       Number(r['id']         || 0),
        parentId: Number(r['topmenuid']  || 0),
        stringId: Number(r['menunameid'] || 0),
        link:     String(r['link']       || ''),
        hide:     ARPGDEX.toBool(r['hide'] || false),
      }))
      .filter(r => !r.hide && r.id);

    items.forEach(item => {
      item.label = (item.stringId ? ARPGDEX.S(item.stringId) : '') || String(item.id);
    });

    const tops = items.filter(r => r.parentId === 0).sort((a,b) => a.id - b.id);
    MENU_GROUPS.length = 0;
    tops.forEach(top => {
      MENU_GROUPS.push({
        id: top.id, label: top.label, link: top.link,
        items: items
          .filter(r => r.parentId === top.id)
          .sort((a,b) => a.id - b.id)
          .map(r => ({
            id: r.id, label: r.label, href: r.link || '#',
            external: !!(r.link && !r.link.endsWith('.html') && !r.link.startsWith('#') && r.link !== ''),
          }))
      });
    });

    cache.set('arpgdex_menu', MENU_GROUPS);

  } catch(e) {
    console.warn('[ARPGDEX] MenuSet 로드 실패, nav-config 사용:', e);
    try {
      const { NAV_ITEMS } = await import('./nav-config.js');
      MENU_GROUPS.length = 0;
      NAV_ITEMS.forEach((g, i) => MENU_GROUPS.push({
        id: i+1, label: g.label, link: '',
        items: g.items.map((item, j) => ({ id: j+1, label: item.label, href: item.href, external: false }))
      }));
    } catch(e2) {}
  }
}

/* ---- 사이트 설정 로드 --------------------------------------- */
export async function loadSiteConfig() {
  const cached = cache.get('arpgdex_siteconfig');
  if (cached) {
    Object.assign(SITE_CONFIG, cached);
    return;
  }

  try {
    // 스트링이 아직 안 로드됐을 수 있으니 보장
    await ARPGDEX.loadStrings();

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=MainOption&range=F28:F38`;
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json?.table?.rows || [];

    // F28 = rows[0] — 사이트명 StringId
    const nameSid = Number(rows[0]?.c?.[0]?.v || 0);
    if (nameSid) SITE_CONFIG.name = ARPGDEX.S(nameSid) || SITE_CONFIG.name;

    // F32 = rows[4] — 디스코드 링크 (URL인 경우만)
    const discordRaw = rows[4]?.c?.[0]?.v || rows[4]?.c?.[0]?.f || '';
    if (discordRaw && (discordRaw.startsWith('http') || discordRaw.startsWith('discord'))) {
      SITE_CONFIG.discordLink = discordRaw;
    }

    // F36 = rows[8] — 히어로 이미지
    const imgRaw = rows[8]?.c?.[0]?.v || rows[8]?.c?.[0]?.f || '';
    if (imgRaw) {
      const m = imgRaw.match(/\/d\/([\w-]+)/);
      SITE_CONFIG.heroImage = m ? `https://drive.google.com/uc?id=${m[1]}&export=view` : imgRaw;
    }

    SITE_CONFIG.sub = ARPGDEX.S(40) || SITE_CONFIG.sub;

    cache.set('arpgdex_siteconfig', SITE_CONFIG);

  } catch(e) {
    console.warn('[ARPGDEX] SiteConfig 로드 실패:', e);
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
        <a class="nav-brand" href="index.html">✦ ${SITE_CONFIG.name}</a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
          <i class="fas fa-bars"></i>
        </button>
        <ul class="nav-links" id="navLinks">
          ${dropdowns}
        </ul>
      </div>
    </nav>`;
}

/* ---- Favicon 로드 (MainOption!F38) -------------------------- */
async function loadFavicon() {
  const cached = cache.get('arpgdex_favicon');
  let faviconUrl = cached;

  if (!faviconUrl) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=MainOption&range=F38`;
      const text = await fetch(url).then(r => r.text());
      const json = JSON.parse(text.substring(47).slice(0, -2));
      const rawUrl = json?.table?.rows?.[0]?.c?.[0]?.v || '';
      if (rawUrl) {
        const m = rawUrl.match(/\/d\/([\w-]+)/);
        faviconUrl = m ? `https://drive.google.com/uc?id=${m[1]}&export=view` : rawUrl;
        cache.set('arpgdex_favicon', faviconUrl);
      }
    } catch(e) {}
  }

  if (faviconUrl) {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = faviconUrl;
  }
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
  await Promise.all([loadMenu(), loadSiteConfig()]);
  await loadIncludes();
  loadFavicon();

  if (SITE_CONFIG.name) {
    document.title = document.title.replace('ARPGDEX', SITE_CONFIG.name);
  }
});
