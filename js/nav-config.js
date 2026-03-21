/* ============================================================= */
/* ARPGDEX Nav Config — shared by header & index quick links     */
/* ============================================================= */
const NAV_ITEMS = [
  {
    label: 'About',
    icon: 'fas fa-book-open',
    items: [
      { label: '이용 약관',    href: 'terms.html' },
      { label: '세계관',       href: 'world.html' },
      { label: '종족 설명',   href: 'species.html' },
      { label: '디자인 가이드', href: 'guide.html' },
    ]
  },
  {
    label: 'Data',
    icon: 'fas fa-dragon',
    items: [
      { label: '마스터리스트', href: 'masterlist.html' },
      { label: '특성',         href: 'traits.html' },
      { label: '아이템',       href: 'items.html' },
      { label: '유저',         href: 'inventories.html' },
    ]
  },
  {
    label: 'Activity',
    icon: 'fas fa-palette',
    items: [
      { label: '프롬프트', href: 'prompts.html' },
      { label: '갤러리',   href: 'gallery.html' },
    ]
  },
  {
    label: '지원',
    icon: 'fas fa-circle-question',
    items: [
      { label: 'FAQ',      href: 'faq.html' },
      { label: '익명 문의', href: '#' },
      { label: '운영진 목록', href: 'staff.html' },
    ]
  },
];

export { NAV_ITEMS };
