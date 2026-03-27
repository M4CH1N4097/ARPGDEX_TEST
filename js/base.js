/* ============================================================= */
/* ARPGDEX Base — nav/footer 로드 + MenuSet 시트 연동           */
/* ============================================================= */
import { ARPGDEX } from './utils.js';


/* ---- 전역 데이터 -------------------------------------------- */
export const MENU_GROUPS = [];
export const SITE_CONFIG = { name: 'ARPGDEX', sub: '', heroImage: '', discordLink: '' };

/* ---- MenuSet 탭 로드 ---------------------------------------- */
export async function loadMenu() {
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
  try {
    await ARPGDEX.loadStrings();
    const url = `https://docs.google.com/spreadsheets/d/${ARPGDEX.sheetId}/gviz/tq?tqx=out:json&sheet=MainOption&range=F28:F38`;
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json?.table?.rows || [];

    const nameSid = Number(rows[0]?.c?.[0]?.v || 0);
    if (nameSid) SITE_CONFIG.name = ARPGDEX.S(nameSid) || SITE_CONFIG.name;

    const discordRaw = rows[4]?.c?.[0]?.v || rows[4]?.c?.[0]?.f || '';
    if (discordRaw && (discordRaw.startsWith('http') || discordRaw.startsWith('discord'))) {
      SITE_CONFIG.discordLink = discordRaw;
    }

    const imgRaw = rows[8]?.c?.[0]?.v || rows[8]?.c?.[0]?.f || '';
    if (imgRaw) {
      const m = imgRaw.match(/\/d\/([\w-]+)/);
      SITE_CONFIG.heroImage = m ? `https://drive.google.com/uc?id=${m[1]}&export=view` : imgRaw;
    }

    SITE_CONFIG.sub = ARPGDEX.S(40) || SITE_CONFIG.sub;

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
  try {
    const url = `https://docs.google.com/spreadsheets/d/${ARPGDEX.sheetId}/gviz/tq?tqx=out:json&sheet=MainOption&range=F38`;
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rawUrl = json?.table?.rows?.[0]?.c?.[0]?.v || '';
    if (!rawUrl) return;
    const m = rawUrl.match(/\/d\/([\w-]+)/);
    const faviconUrl = m ? `https://drive.google.com/uc?id=${m[1]}&export=view` : rawUrl;
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = faviconUrl;
  } catch(e) {}
}

/* ---- Includes 로드 ------------------------------------------ */
async function loadIncludes() {
  // nav 교체 전 placeholder 숨기기
  document.querySelectorAll('[data-include="includes/header.html"]').forEach(el => {
    el.style.visibility = 'hidden';
    const div = document.createElement('div');
    div.innerHTML = buildNav();
    const nav = div.firstElementChild;
    nav.style.visibility = 'visible';
    el.replaceWith(nav);
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

  // 글로벌 툴팁 (overflow:hidden 탈출용 fixed 방식)
  const box = document.createElement('div');
  box.id = 'arpg-tooltip-box';
  document.body.appendChild(box);

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.arpg-tooltip');
    if (!el) return;
    const tip = el.dataset.tip;
    if (!tip) return;
    box.textContent = tip;
    box.classList.add('visible');
  });
  document.addEventListener('mousemove', e => {
    if (!box.classList.contains('visible')) return;
    box.style.left = (e.clientX + 12) + 'px';
    box.style.top  = (e.clientY - 28) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.arpg-tooltip')) box.classList.remove('visible');
  });
});
