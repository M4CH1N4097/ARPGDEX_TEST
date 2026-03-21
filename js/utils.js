/* ============================================================= */
/* ARPGDEX Utilities & Google Sheet Importer
/* ============================================================= */

const ARPGDEX = {};

/* ---- Config -------------------------------------------------- */
// ARPGDEX [데이터] 시트 ID
ARPGDEX.sheetId = "1Sy_IFOM7aQz07_CjzEwteNy1h1IyMa1n3JGKjHqAJtM";

/* ---- URL Helpers --------------------------------------------- */
ARPGDEX.getParam = (key) => new URLSearchParams(location.search).get(key);
ARPGDEX.pageUrl = (page) => {
  const base = location.href.split('/').slice(0,-1).join('/');
  return `${base}/${page}.html`;
};

/* ---- Import Sheet -------------------------------------------- */
// sheetId 생략 시 기본 ARPGDEX[데이터] 사용
ARPGDEX.importSheet = async (sheetPage, sheetId) => {
  const id = sheetId || ARPGDEX.sheetId;
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1&tq=WHERE%20A%20IS%20NOT%20NULL&sheet=${encodeURIComponent(sheetPage)}`;
  try {
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cols = json.table.cols.map(c => c.label.toLowerCase().replace(/\s/g,''));
    return json.table.rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        obj[col] = cell == null ? '' : (cell.f ?? cell.v ?? '');
      });
      return obj;
    });
  } catch(e) {
    console.warn('Sheet import failed:', sheetPage, e);
    return [];
  }
};

/* ---- Load String Table --------------------------------------- */
// String 탭에서 ID → KOR 맵 반환
ARPGDEX._strings = {};
ARPGDEX.loadStrings = async () => {
  const rows = await ARPGDEX.importSheet('String');
  const map = {};
  for (const row of rows) {
    const id = Number(row['id'] ?? row['!id'] ?? '');
    const kor = row['kor'] ?? row['KOR'] ?? '';
    if (id && kor) map[id] = kor;
  }
  ARPGDEX._strings = map;
  return map;
};
// S(id) — 스트링 ID로 텍스트 반환
ARPGDEX.S = (id) => ARPGDEX._strings[id] || '';

/* ---- Scrub (lowercase alphanumeric) -------------------------- */
ARPGDEX.scrub = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/* ---- Simple debounce ----------------------------------------- */
ARPGDEX.debounce = (fn, ms = 200) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

/* ---- Pagination helper --------------------------------------- */
ARPGDEX.paginate = (arr, page, perPage) => {
  const total = Math.ceil(arr.length / perPage);
  const start = (page - 1) * perPage;
  return { items: arr.slice(start, start + perPage), total, page };
};

/* ---- Render pagination buttons ------------------------------ */
ARPGDEX.renderPagination = (container, current, total, onChange) => {
  if (!container || total <= 1) { if(container) container.innerHTML=''; return; }
  let html = '';
  const btn = (label, page, disabled=false, active=false) =>
    `<button class="page-btn${active?' active':''}${disabled?' disabled':''}" ${disabled?'disabled':''} data-page="${page}">${label}</button>`;
  html += btn('<i class="fas fa-chevron-left"></i>', current-1, current===1);
  for (let i=1; i<=total; i++) {
    if (total > 7 && i > 2 && i < total-1 && Math.abs(i-current) > 1) {
      if (i === 3 || i === total-2) html += `<button class="page-btn" disabled>…</button>`;
      continue;
    }
    html += btn(i, i, false, i===current);
  }
  html += btn('<i class="fas fa-chevron-right"></i>', current+1, current===total);
  container.innerHTML = html;
  container.querySelectorAll('.page-btn:not([disabled])').forEach(b => {
    b.addEventListener('click', () => onChange(+b.dataset.page));
  });
};

/* ---- Rarity badge ------------------------------------------- */
ARPGDEX.rarityBadge = (rarity) => {
  if (!rarity) return '';
  const cls = ARPGDEX.scrub(rarity).replace('veryrare','veryrare').replace('very rare','veryrare');
  return `<span class="badge badge-${cls}">${rarity}</span>`;
};

/* ---- Bool from sheet cell ------------------------------------ */
// TRUE / FALSE / "O" / "X" / 1 / 0 을 boolean으로 변환
ARPGDEX.toBool = (val) => {
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'o' || s === 'yes';
};

export { ARPGDEX };
