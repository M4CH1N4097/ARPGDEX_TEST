/* ============================================================= */
/* ARPGDEX Utilities & Google Sheet Importer
/* ============================================================= */

const ARPGDEX = {};

/* ---- Config -------------------------------------------------- */
ARPGDEX.sheetId = "1Sy_IFOM7aQz07_CjzEwteNy1h1IyMa1n3JGKjHqAJtM";

/* ---- URL Helpers --------------------------------------------- */
ARPGDEX.getParam = (key) => new URLSearchParams(location.search).get(key);
ARPGDEX.pageUrl = (page) => {
  const base = location.href.split('/').slice(0,-1).join('/');
  return `${base}/${page}.html`;
};

/* ---- Import Sheet -------------------------------------------- */
/*
  시트 구조:
  - 1행: 제목/설명 (무시)
  - 2행: 컬럼 헤더 (!로 시작하는 컬럼은 코드에서 사용 안 함)
  - 3행~: 실제 데이터
  → range=A2:ZZ 로 2행부터 읽고, headers=1 로 2행을 헤더로 사용
*/
ARPGDEX.importSheet = async (sheetPage, sheetId) => {
  const id = sheetId || ARPGDEX.sheetId;
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetPage)}&range=A2:ZZ`;
  try {
    const text = await fetch(url).then(r => r.text());
    // 15자리 이상 정수 및 지수표기법(Discord ID 등)을 JSON 파싱 전에 문자열로 보존
    const safeText = text.substring(47).slice(0, -2)
      .replace(/"v":(\d{15,})/g, '"v":"$1"')
      .replace(/"v":([\d.]+e\+\d+)/g, (_, n) => `"v":"${BigInt(Math.round(Number(n))).toString()}"`);
    const json = JSON.parse(safeText);

    // 컬럼 헤더: !로 시작하는 것 제외, 소문자+공백제거
    const cols = json.table.cols.map(c => {
      const label = c.label || '';
      return label.startsWith('!') ? null : label.toLowerCase().replace(/\s/g, '');
    });

    return json.table.rows
      .map(row => {
        const obj = {};
        cols.forEach((col, i) => {
          if (!col) return; // ! 컬럼 스킵
          const cell = row.c[i];
          obj[col] = cell == null ? '' : (cell.f ?? cell.v ?? '');
        });
        return obj;
      })
      .filter(row => {
        // hide 컬럼이 TRUE면 제외
        const hideVal = row['hide'];
        if (hideVal !== undefined && String(hideVal).toUpperCase() === 'TRUE') return false;
        // 완전히 빈 행 제외
        return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
      });
  } catch(e) {
    console.warn('Sheet import failed:', sheetPage, e);
    return [];
  }
};

/* ---- Load String Table --------------------------------------- */
// String 탭: ID 컬럼 → KOR 컬럼 맵
ARPGDEX._strings = {};
ARPGDEX.loadStrings = async () => {
  const rows = await ARPGDEX.importSheet('String');
  const map = {};
  for (const row of rows) {
    // 컬럼명이 소문자 처리됨: 'id', 'kor'
    const id  = Number(row['id']  ?? row['!id'] ?? '');
    const kor = String(row['kor'] ?? '').trim();
    if (id && kor) map[id] = kor;
  }
  ARPGDEX._strings = map;
  return map;
};

// S(id) — 스트링 ID로 한국어 텍스트 반환
ARPGDEX.S = (id) => ARPGDEX._strings[id] || '';

/* ---- Scrub --------------------------------------------------- */
ARPGDEX.scrub = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/* ---- Debounce ------------------------------------------------ */
ARPGDEX.debounce = (fn, ms = 200) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

/* ---- Pagination ---------------------------------------------- */
ARPGDEX.paginate = (arr, page, perPage) => {
  const total = Math.ceil(arr.length / perPage);
  const start = (page - 1) * perPage;
  return { items: arr.slice(start, start + perPage), total, page };
};

/* ---- Render Pagination --------------------------------------- */
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

/* ---- Rarity Badge -------------------------------------------- */
ARPGDEX.rarityBadge = (rarity) => {
  if (!rarity) return '';
  const cls = ARPGDEX.scrub(rarity).replace('veryrare','veryrare').replace('very rare','veryrare');
  return `<span class="badge badge-${cls}">${rarity}</span>`;
};

/* ---- Bool from sheet cell ------------------------------------ */
// TRUE / FALSE / "O" / "X" / 1 / 0 인식
ARPGDEX.toBool = (val) => {
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'o' || s === 'yes';
};

/* ---- Google Drive 이미지 URL 변환 ----------------------------- */
// drive.google.com/file/d/ID/view → uc?id=ID&export=view 형식으로
ARPGDEX.driveImgUrl = (url) => {
  if (!url) return '';
  const m = url.match(/\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/uc?id=${m[1]}&export=view`;
  return url;
};

/* ---- 통화 단위 (MainOption!D28) ------------------------------ */
ARPGDEX.currencyUnit = '￦';  // 기본값

ARPGDEX.loadCurrency = async () => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${ARPGDEX.sheetId}/gviz/tq?tqx=out:json&sheet=MainOption&range=D28`;
    const text = await fetch(url).then(r => r.text());
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cell = json?.table?.rows?.[0]?.c?.[0];
    const val  = cell?.v || cell?.f || '';
    if (val) ARPGDEX.currencyUnit = String(val).trim();
  } catch(e) { /* 기본값 유지 */ }
};

/* ---- 가치 포맷 변환 ------------------------------------------ */
// 30000 → "3.0 (30,000 ￦)"
// 단위 기준: 10,000 (만원 단위 팬덤 표기)
ARPGDEX.formatValue = (raw) => {
  const num = Number(String(raw).replace(/,/g, ''));
  if (!raw || isNaN(num)) return '-';
  const unit  = ARPGDEX.currencyUnit;
  const full  = num.toLocaleString('ko-KR');
  const divided = num / 10000;
  const shortStr = Number.isInteger(divided)
    ? divided.toFixed(1)
    : divided.toString();
  return `<span style="font-size:1.3rem;font-weight:700;color:var(--text-primary);">${shortStr}</span><br><span style="font-size:.82rem;font-weight:400;color:var(--text-muted);">(${full}${unit})</span>`;
};

export { ARPGDEX };
