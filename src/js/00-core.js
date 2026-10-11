/* ==========================================================================
   Diksiyon Stüdyosu — arayüz çekirdeği: yardımcılar, simgeler, durum, kalıcı ayarlar
   ========================================================================== */
const E = window.DiksiyonEngine;
const BANK = window.DIKSIYON_BANK || {};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtTime = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const trNum = (n, d) => n.toLocaleString('tr-TR', { maximumFractionDigits: d == null ? 1 : d });

/* ---- kalıcı ayarlar (özel modda da çökmez) ---- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('dk.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dk.' + k, JSON.stringify(v)); } catch (e) { /* yoksay */ } }
};

/* ---- simgeler ---- */
const ICONS = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" fill="currentColor" stroke="none"/>',
  prev: '<path d="M6 5v14"/><path d="M19 5L9 12l10 7z" fill="currentColor"/>',
  next: '<path d="M18 5v14"/><path d="M5 5l10 7-10 7z" fill="currentColor"/>',
  loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/>',
  tick: '<path d="M8 21h8l-2-17h-4z"/><path d="M12 17l4-8"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 21h8M12 16v5"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2.2M12 17h.01"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-6a2 2 0 012-2h12a2 2 0 012 2v6h-3"/><rect x="7" y="14" width="10" height="7"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  wave: '<path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 10v4"/>',
  star: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M9 7h6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  lungs: '<path d="M12 4v9M8 10c-3 1-5 5-5 9 0 1 1 1.5 2 1.2 2.5-.7 3-3 3-5.2zM16 10c3 1 5 5 5 9 0 1-1 1.5-2 1.2-2.5-.7-3-3-3-5.2z"/>',
  text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>'
};
const ic = (n) => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
function hydrateIcons(root) { $$('i[data-ic]', root).forEach((el) => { el.outerHTML = ic(el.dataset.ic); }); }

/* ---- yalnız dikey kaydırma: scrollIntoView sayfayı yana da kaydırıp telefonda içeriği sola itebiliyordu ---- */
function vScroll(el, o) {
  if (!el) return; o = o || {};
  const r = el.getBoundingClientRect(), vh = window.innerHeight, top = 72, bot = o.bottom != null ? o.bottom : 24;
  let y;
  if (o.block === 'nearest') {
    if (r.top < top) y = window.scrollY + r.top - top - 8;
    else if (r.bottom > vh - bot) y = window.scrollY + r.bottom - vh + bot + 8;
    else return;
  } else {
    y = window.scrollY + r.top - (vh - r.height) / 2;
  }
  window.scrollTo({ top: Math.max(0, Math.round(y)), left: 0, behavior: o.behavior || 'auto' });
}

/* ---- düğme dalgası ---- */
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn');
  if (!b || REDUCED) return;
  const r = b.getBoundingClientRect();
  const s = document.createElement('span');
  const d = Math.max(r.width, r.height) * 1.6;
  s.className = 'rp';
  s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
  b.appendChild(s);
  setTimeout(() => s.remove(), 650);
}, { passive: true });

/* ---- bildirim ---- */
let toastT = 0;
function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), ms || 2400);
}

/* ---- katmanlar ---- */
const LAYERS = [
  { id: 'vurgu', name: 'Vurgu', sub: 'Hangi hece öne çıkar', col: '--c-vurgu' },
  { id: 'durak', name: 'Durak ve soluk', sub: '/ kısa durak · // soluk', col: '--c-vurgu' },
  { id: 'bag', name: 'Ulama', sub: 'Sözcükler arası bağ', col: '--c-bag' },
  { id: 'unlu', name: 'Ünlüler', sub: 'Açık / kapalı e, uzun ünlü', col: '--c-acik' },
  { id: 'n', name: 'n, m ve ng', sub: 'n ünsüzünün dönüşümü', col: '--c-n' },
  { id: 'kalin', name: 'Kalın / ince', sub: 'l, k, g', col: '--c-ince' },
  { id: 'ozel', name: 'ğ, v, h, çift ünsüz', sub: 'Özel söyleyişler', col: '--c-ozel' },
  { id: 'son', name: 'Sondaki ünsüz', sub: 'Sonlar yutulmasın', col: '--c-son' },
  { id: 'zor', name: 'Zor kümeler', sub: 'Yan yana ünsüzler', col: '--c-zor' },
  { id: 'heceler', name: 'Heceler', sub: 'Hece sınırları', col: '--ink2' },
  { id: 'hata', name: 'Sık yapılan hatalar', sub: 'Yanlış söylenen sözcükler', col: '--c-hata' }
];
const LAYER = {}; LAYERS.forEach((l) => { LAYER[l.id] = l; });
const PRESETS = [
  { id: 'duz', name: 'Düz', on: [] },
  { id: 'okuma', name: 'Okuma', on: ['vurgu', 'durak', 'bag'] },
  { id: 'harf', name: 'Harf harf', on: ['unlu', 'n', 'kalin', 'ozel', 'son', 'zor', 'heceler'] },
  { id: 'hepsi', name: 'Hepsi', on: LAYERS.map((l) => l.id) }
];
const DEFAULT_ON = ['vurgu', 'durak', 'bag', 'unlu'];
const LAYER_LEGEND = {
  unlu: [['ɛ', 'açık e', '--c-acik'], ['e', 'kapalı e', '--c-kapali'], ['â', 'uzun ünlü', '--c-uzun']],
  n: [['m', 'n → m', '--c-n'], ['ŋ', 'n → ng sesi', '--c-n']],
  kalin: [['l', 'ince', '--c-ince'], ['l', 'kalın', '--c-kalin']],
  ozel: [['ğ', 'ünlüyü uzat', '--c-ozel']],
  son: [['t', 'sonda net', '--c-son']],
  bag: [['‿', 'ulama', '--c-bag']],
  vurgu: [['ta', 'vurgulu hece', '--c-vurgu']],
  durak: [['/', 'kısa durak', '--c-vurgu'], ['//', 'durak + soluk', '--c-vurgu']],
  zor: [['rk', 'zor küme', '--c-zor']]
};
const KIND = {
  bildirme: { name: 'Bildirme', glyph: '.', tone: '↘', hint: 'Ses sonda alçalır.' },
  soru: { name: 'Soru', glyph: '?', tone: '↗', hint: 'Ses sonda yükselir (mı/mi\'den önce yükselip sonda düşer).' },
  emir: { name: 'Emir', glyph: '!', tone: '↓', hint: 'Net ve kararlı; sonda sert alçalış.' },
  unlem: { name: 'Ünlem', glyph: '‼', tone: '↗↘', hint: 'Duygu vurgusu; ses yükselip düşer.' },
  askida: { name: 'Askıda', glyph: '…', tone: '→', hint: 'Cümle havada kalır; ses düşmez.' }
};
const CONF = { kesin: 'Kesin kural', egilim: 'Genel eğilim', hoca: 'Hocaya göre' };

/* ---- uygulama durumu ---- */
const App = {
  text: '', A: null, on: new Set(store.get('on', DEFAULT_ON)),
  selW: -1, selS: -1, kinds: {}, // cümle türü geçersiz kılmaları: metin-imzası -> tür
  tempo: store.get('tempo', 'normal'), cap: store.get('cap', 22), rs: store.get('rs', 26),
  hoca: store.get('hoca', { on: false, stress: {}, eKapali: {}, ince: [] }),
  view: 'read', tick: false, loop: false
};
if (!App.hoca || typeof App.hoca !== 'object') App.hoca = { on: false, stress: {}, eKapali: {}, ince: [] };
App.hoca.stress = App.hoca.stress || {}; App.hoca.eKapali = App.hoca.eKapali || {}; App.hoca.ince = App.hoca.ince || [];
LAYERS.forEach((l) => { if (!LAYER[l.id]) App.on.delete(l.id); });
Array.from(App.on).forEach((id) => { if (!LAYER[id]) App.on.delete(id); });

function engineOpts() {
  const h = App.hoca;
  const has = h.on && (Object.keys(h.stress).length || Object.keys(h.eKapali).length || h.ince.length);
  return { user: has ? { stress: h.stress, eKapali: h.eKapali, ince: h.ince } : null, breathCapacity: App.cap };
}
function saveHoca() { store.set('hoca', App.hoca); }
function hocaCount() { const h = App.hoca; return Object.keys(h.stress).length + Object.keys(h.eKapali).length + h.ince.length; }

/* katman başına işaret sayıları */
function layerCounts(A) {
  const c = {};
  LAYERS.forEach((l) => { c[l.id] = 0; });
  if (!A) return c;
  for (const w of A.words) {
    for (const m of w.marks) {
      if (c[m.layer] != null && m.code !== 'ULAMA_ALAN') c[m.layer]++;
    }
    if (w.stress.syl >= 0) c.vurgu += 0; // vurgu işareti zaten sayılıyor
    c.heceler += w.syl.length > 1 ? w.syl.length : 0;
  }
  c.durak = 0;
  for (const S of A.sentences) c.durak += S.phrases.length + S.phrases.filter((p) => p.suggest).length;
  return c;
}
