/* ==========================================================================
   Sahne çizimi: sözcük → hece → harf, katman rayı, ipuçları, seçim
   ========================================================================== */
const MARK_INDEX = new Map(); // işaret kimliği -> { m, w }

function markColor(m) {
  switch (m.layer) {
    case 'unlu': return m.code === 'E_ACIK' ? '--c-acik' : (m.code.indexOf('E_') === 0 ? '--c-kapali' : '--c-uzun');
    case 'n': return '--c-n';
    case 'kalin': return /_INCE$/.test(m.code) ? '--c-ince' : '--c-kalin';
    case 'ozel': return '--c-ozel';
    case 'son': return '--c-son';
    case 'bag': return '--c-bag';
    case 'vurgu': return '--c-vurgu';
    case 'zor': return '--c-zor';
    case 'hata': return '--c-hata';
    default: return '--ink3';
  }
}

/** işaret -> harf görünüm sınıfı ve hayalet harf */
function visFor(m, q) {
  const c = m.code;
  if (c === 'E_ACIK') return { c: 'e-a', s: 'ɛ' };
  if (c === 'E_KAPALI') return { c: 'e-k' };
  if (c === 'E_KAPALI_ISTISNA') return { c: 'e-x' };
  if (c === 'UNLU_UZUN') return { c: 'uz', s: 'ː' };
  if (c === 'IKI_UNLU') return { c: 'iu' };
  if (c === 'N_M') return { c: 'nm', s: 'm' };
  if (c === 'N_NG') return { c: 'ng', s: 'ŋ' };
  if (c === 'N_M_SINIR') return { c: 'nb' };
  if (/_INCE$/.test(c)) return { c: 'th' + (m.sev === 'tip' ? ' ex' : '') };
  if (/_KALIN$/.test(c)) return { c: 'kn' };
  if (c === 'G_UZAT') return m.at.length === 2 ? (q === 0 ? { c: 'gu', s: 'ː' } : { c: 'gu gq' }) : { c: 'gu', s: 'ː' };
  if (c === 'G_ACAG') return { c: 'gu gq' };
  if (c === 'V_YUMUSAK' || c === 'V_SON') return { c: 'vy' };
  if (c === 'H_NET') return { c: 'hn' };
  if (c === 'CIFT_UNSUZ') return { c: 'cu' };
  if (c.indexOf('SON_') === 0) return { c: 'so' };
  if (c.indexOf('KUME_') === 0) return { c: 'ku' };
  if (c === 'ULAMA') return { c: 'ul' };
  if (c === 'KAYNASTIRMA') return { c: 'kz' };
  return null;
}

/** tek sözcüğün HTML'i. o: { lab, plain, noFocus } */
function wordHTML(w, o) {
  o = o || {};
  const Ls = w.letters;
  const info = new Array(Ls.length).fill(null);
  let hw = false;
  if (!o.plain) {
    for (const m of w.marks) {
      if (m.code === 'HATA_SIK') hw = true;
      if (!m.at.length) continue;
      m.at.forEach((i, q) => {
        const L = Ls[i]; if (!L) return;
        const x = info[i] || (info[i] = { cls: [], ms: [], s: '' });
        x.ms.push(m.id);
        const v = visFor(m, q);
        if (v) {
          if (v.c) v.c.split(' ').forEach((c) => { if (x.cls.indexOf(c) < 0) x.cls.push(c); });
          if (v.s && !x.s) x.s = v.s;
        }
        if (m.conf === 'egilim' && x.cls.indexOf('tn') < 0) x.cls.push('tn');
      });
    }
  }
  const cls = ['w'];
  if (!o.lab && w.sentence && w.sentence.focus && w.sentence.focus.wi === w.si) cls.push('f');
  if (w.flags && w.flags.clitic) cls.push('cl');
  if (hw) cls.push('hw');
  const gi = w.gi == null ? 0 : w.gi;
  let h = '<span class="' + cls.join(' ') + '" data-gi="' + gi + '" style="--d:' + ((gi % 36) * 14) + '">';
  for (let si = 0; si < w.syl.length; si++) {
    const S = w.syl[si];
    h += '<span class="sy' + (w.stress.syl === si ? ' st' : '') + '" data-k="' + si + '">';
    let plain = '';
    for (let i = S.from; i < S.to; i++) {
      const L = Ls[i], x = info[i], ap = w.aposAfter[i] || '';
      if (!x) { plain += esc(L.ch) + ap; continue; }
      if (plain) { h += plain; plain = ''; }
      h += '<span class="l ' + x.cls.join(' ') + '" data-i="' + i + '" data-m="' + x.ms.join(' ') + '"' + (x.s ? ' data-s="' + x.s + '"' : '') + '>' + esc(L.ch) + '</span>' + ap;
    }
    h += plain + '</span>';
  }
  return h + '</span>';
}

function pauseChip(p) {
  const ps = p.pause || {};
  const long = !!ps.soluk;
  const label = (ps.name || 'duraklama') + (ps.soluk === true ? ' · durak ve soluk' : ps.soluk === 'mumkun' ? ' · durak, soluk mümkün' : ' · kısa durak');
  return '<span class="pz' + (ps.soluk === true ? ' big' : '') + '" title="' + esc(label) + '"><b>' + (long ? '//' : '/') + '</b></span>';
}

function toneGlyph(S) {
  if (S.kind === 'soru' && (S.hasMi || S.hasWh)) return '↗↘';
  return (KIND[S.kind] || KIND.bildirme).tone;
}

/** cümlenin satır içeriği (sözcükler, noktalama, duraklar) */
function lineHTML(S) {
  const words = S.words;
  const suggest = {};
  S.phrases.forEach((ph) => { if (ph.suggest) suggest[ph.suggest.before] = ph.suggest.why; });
  const k = KIND[S.kind] || KIND.bildirme;
  let h = '';
  words.forEach((w, i) => {
    if (i > 0) {
      const a = words[i - 1];
      if (a.linkNext && a.linkNext.kind === 'ulama') h += '<span class="ulm" style="--d:' + ((w.gi % 36) * 14) + '"></span>​';
      else if (!w.glue) h += ' ';
    }
    if (suggest[i] != null) h += '<span class="pz sg" title="' + esc(suggest[i]) + '"><b>⌄ soluk?</b></span>';
    if (w.group && w.group.i === 0) h += '<span class="grp" data-t="' + esc(w.group.text) + '">';
    (w.pre || []).forEach((q) => { h += '<span class="pu">' + esc(q.ch) + '</span>'; });
    h += wordHTML(w);
    let lastP = null;
    w.post.forEach((p) => { h += '<span class="pu">' + esc(p.ch) + '</span>'; if (p.t === 'p') lastP = p; });
    if (lastP) h += pauseChip(lastP);
    if (w.group && w.group.i === w.group.n - 1) h += '</span>';
    if (i === words.length - 1 && lastP) h += '<span class="tn-end" title="' + esc(k.name + ': ' + k.hint) + '">' + toneGlyph(S) + '</span>';
  });
  return h;
}

function sentenceHTML(S, idx) {
  const hd = clamp(S.score / 3, 0, 1);
  const k = KIND[S.kind] || KIND.bildirme;
  let h = '<section class="sent k-' + S.kind + (S.paraStart && idx > 0 ? ' pst' : '') + '" data-si="' + idx + '" style="--hd:' + hd.toFixed(2) + ';--hc:' + (hd > .6 ? 'var(--c-zor)' : hd > .35 ? 'var(--c-vurgu)' : 'var(--c-ince)') + '">';
  h += '<button class="sg" type="button" data-sg="' + idx + '" aria-label="' + (idx + 1) + '. cümle: ayrıntıları aç"><span class="sg-n">' + (idx + 1) + '</span><span class="sg-k">' + esc(k.glyph) + '</span><span class="sg-h"></span></button>';
  h += '<p class="line" lang="tr">' + lineHTML(S) + '</p></section>';
  return h;
}

function indexMarks() {
  MARK_INDEX.clear();
  for (const w of App.A.words) for (const m of w.marks) MARK_INDEX.set(m.id, { m, w });
}

function renderStage(opts) {
  opts = opts || {};
  const A = App.A, stage = $('#stage');
  stage.classList.toggle('perf', A.words.length > 1400);
  let h = '';
  A.sentences.forEach((S, i) => { h += sentenceHTML(S, i); });
  stage.innerHTML = h;
  indexMarks();
  if (opts.enter && !REDUCED) {
    stage.classList.add('enter');
    setTimeout(() => stage.classList.remove('enter'), 1700);
  }
  if (App.selW >= 0) { const el = $('#stage .w[data-gi="' + App.selW + '"]'); if (el) el.classList.add('sel'); }
  if (App.selS >= 0) markSentSel(App.selS);
  updateCounts();
  updateTextbar();
}

function rerenderSentence(si) {
  const S = App.A.sentences[si];
  const el = $('#stage .sent[data-si="' + si + '"]');
  if (!el || !S) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = sentenceHTML(S, si);
  el.replaceWith(tmp.firstChild);
  indexMarks();
  if (App.selS === si) markSentSel(si);
  if (App.selW >= 0 && App.A.words[App.selW] && App.A.words[App.selW].sentence.index === si) { const w = $('#stage .w[data-gi="' + App.selW + '"]'); if (w) w.classList.add('sel'); }
}

function markSentSel(si) {
  $$('#stage .sent.sel').forEach((x) => x.classList.remove('sel'));
  const el = $('#stage .sent[data-si="' + si + '"]');
  if (el) el.classList.add('sel');
}

/* ---- katman rayı ---- */
function buildRail() {
  $('#presets').innerHTML = PRESETS.map((p) => '<button class="pre" type="button" data-pre="' + p.id + '">' + esc(p.name) + '</button>').join('');
  $('#lys').innerHTML = LAYERS.map((l, i) =>
    '<button class="ly" type="button" data-ly="' + l.id + '" aria-pressed="false" style="--lc:var(' + l.col + ')" title="' + esc(l.sub) + ' (' + ((i + 1) % 10) + ')"><span class="sw"></span><span class="lbl">' + esc(l.name) + '<small>' + esc(l.sub) + '</small></span><span class="ct">0</span></button>'
  ).join('');
}

function updateCounts() {
  const c = layerCounts(App.A);
  $$('#lys .ly').forEach((b) => {
    const el = $('.ct', b), n = c[b.dataset.ly] || 0;
    el.classList.toggle('z', n === 0);
    countTo(el, n);
  });
}
function countTo(el, n) {
  const from = +el.dataset.v || 0; el.dataset.v = n;
  if (REDUCED || from === n) { el.textContent = n; return; }
  const t0 = performance.now(), dur = 700;
  (function step(t) {
    const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (n - from) * e);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

function applyLayers() {
  const stage = $('#stage');
  const on = Array.from(App.on);
  stage.dataset.on = on.join(' ');
  const n = on.length;
  stage.dataset.dens = n === 0 ? 0 : n <= 3 ? 1 : 2;
  $$('#lys .ly').forEach((b) => b.setAttribute('aria-pressed', App.on.has(b.dataset.ly) ? 'true' : 'false'));
  $$('#presets .pre').forEach((b) => {
    const p = PRESETS.find((x) => x.id === b.dataset.pre);
    const same = p.on.length === n && p.on.every((x) => App.on.has(x));
    b.classList.toggle('on', same);
  });
  // gösterge
  const lg = $('#legend');
  let h = '';
  LAYERS.forEach((l) => {
    if (!App.on.has(l.id) || !LAYER_LEGEND[l.id]) return;
    LAYER_LEGEND[l.id].forEach((it) => { h += '<span><i style="color:var(' + it[2] + ');background:color-mix(in srgb,var(' + it[2] + ') 16%,transparent)">' + esc(it[0]) + '</i>' + esc(it[1]) + '</span>'; });
  });
  lg.innerHTML = h;
  store.set('on', on);
}

function setLayers(ids) { App.on = new Set(ids); applyLayers(); }
function toggleLayer(id) {
  if (App.on.has(id)) App.on.delete(id); else App.on.add(id);
  applyLayers();
}

/** ilk açılışta katmanları sırayla yakar ("tarama") */
async function scanLayers(target) {
  const order = ['vurgu', 'durak', 'bag', 'unlu', 'n', 'kalin', 'ozel', 'son', 'zor', 'heceler', 'hata'].filter((x) => target.indexOf(x) >= 0);
  if (REDUCED) { setLayers(target); return; }
  App.on = new Set(); applyLayers();
  await sleep(650);
  for (const id of order) {
    App.on.add(id); applyLayers();
    await sleep(420);
    if (App.view !== 'read') break;
  }
}

/* ---- ipucu balonu ---- */
const TIP = { el: null, t: 0 };
function showTip(html, rect) {
  const tip = TIP.el || (TIP.el = $('#tip'));
  tip.innerHTML = html; tip.classList.add('on');
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = rect.left + rect.width / 2 - tw / 2, y = rect.top - th - 12;
  if (y < 8) y = rect.bottom + 12;
  x = clamp(x, 8, window.innerWidth - tw - 8);
  tip.style.transform = ''; tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip() { (TIP.el || (TIP.el = $('#tip'))).classList.remove('on'); }

const PRIORITY = ['hata', 'zor', 'unlu', 'n', 'kalin', 'ozel', 'son', 'bag', 'vurgu'];
function sortMarks(ms) { return ms.slice().sort((a, b) => PRIORITY.indexOf(a.layer) - PRIORITY.indexOf(b.layer)); }

function tipForLetter(el) {
  const ids = (el.dataset.m || '').split(' ').filter(Boolean);
  const ms = sortMarks(ids.map((id) => MARK_INDEX.get(id)).filter(Boolean).map((x) => x.m));
  const visible = ms.filter((m) => App.on.has(m.layer));
  const m = visible[0] || ms[0];
  if (!m) return null;
  return '<b><i style="background:var(' + markColor(m) + ')"></i>' + esc(m.title) + '</b>' + esc(m.text) + '<small>' + CONF[m.conf] + ' · tıkla: ayrıntı</small>';
}
function tipForWord(el) {
  const w = App.A.words[+el.dataset.gi]; if (!w) return null;
  const syl = w.syl.map((s, i) => w.stress.syl === i ? '<u>' + esc(E.sylText(w, i)) + '</u>' : esc(E.sylText(w, i))).join('·');
  return '<span class="sy-line">' + syl + '</span><small>okunuşu: ' + esc(w.say) + '</small>';
}

/* ---- seçim ---- */
function selectWord(gi, o) {
  o = o || {};
  const w = App.A.words[gi]; if (!w) return;
  $$('#stage .w.sel').forEach((x) => x.classList.remove('sel'));
  const el = $('#stage .w[data-gi="' + gi + '"]'); if (el) el.classList.add('sel');
  App.selW = gi; App.selS = w.sentence.index;
  markSentSel(App.selS);
  renderLab(w, { focusMark: o.markId });
  renderSentPane(w.sentence);
  showPane('word');
  if (!o.quiet) openSide();
}
function selectSentence(si, o) {
  o = o || {};
  const S = App.A.sentences[si]; if (!S) return;
  App.selS = si; markSentSel(si);
  renderSentPane(S);
  showPane('sent');
  if (!o.quiet) openSide();
}
function showPane(id) {
  $$('.stabs [data-pane]').forEach((b) => b.setAttribute('aria-selected', b.dataset.pane === id ? 'true' : 'false'));
  $('#pane-word').classList.toggle('on', id === 'word');
  $('#pane-sent').classList.toggle('on', id === 'sent');
}
function openSide() {
  if (window.matchMedia('(max-width:1180px)').matches) { $('#side').classList.add('open'); document.body.classList.add('sideopen'); }
}
function closeSide() { $('#side').classList.remove('open'); document.body.classList.remove('sideopen'); }

function bindStage() {
  const stage = $('#stage');
  let hoverEl = null;
  stage.addEventListener('pointerover', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const l = e.target.closest('.l'), w = e.target.closest('.w');
    const t = l && l.dataset.m ? l : w;
    if (t === hoverEl) return;
    hoverEl = t; clearTimeout(TIP.t);
    if (!t) { hideTip(); return; }
    TIP.t = setTimeout(() => {
      const html = t.classList.contains('l') ? tipForLetter(t) : tipForWord(t);
      if (html) showTip(html, t.getBoundingClientRect()); else hideTip();
    }, t.classList.contains('l') ? 90 : 380);
  });
  stage.addEventListener('pointerleave', () => { hoverEl = null; clearTimeout(TIP.t); hideTip(); });
  stage.addEventListener('click', (e) => {
    hideTip();
    const sg = e.target.closest('.sg');
    if (sg) { selectSentence(+sg.dataset.sg); return; }
    const w = e.target.closest('.w'); if (!w) return;
    const l = e.target.closest('.l');
    const ids = l && l.dataset.m ? l.dataset.m.split(' ') : [];
    const w0 = App.A.words[+w.dataset.gi];
    const best = sortMarks(ids.map((id) => MARK_INDEX.get(id)).filter(Boolean).map((x) => x.m)).find((m) => App.on.has(m.layer)) || sortMarks(ids.map((id) => MARK_INDEX.get(id)).filter(Boolean).map((x) => x.m))[0];
    selectWord(w0.gi, { markId: best && best.id });
  });
  stage.addEventListener('dblclick', (e) => { const w = e.target.closest('.w'); if (w) playFromWord(+w.dataset.gi); });
  // klavye: oklar sözcük/cümle gezdirir
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'Metin. Sözcükler arasında gezinmek için ok tuşları, ayrıntı için Enter.');
  stage.addEventListener('keydown', (e) => {
    const k = e.key; let gi = App.selW;
    if (k === 'ArrowRight') gi = Math.min(App.A.words.length - 1, gi + 1);
    else if (k === 'ArrowLeft') gi = Math.max(0, gi - 1);
    else if (k === 'ArrowDown' || k === 'ArrowUp') {
      const cur = gi >= 0 ? App.A.words[gi].sentence.index : (App.selS >= 0 ? App.selS : 0);
      const ns = clamp(cur + (k === 'ArrowDown' ? 1 : -1), 0, App.A.sentences.length - 1);
      gi = App.A.sentences[ns].words[0].gi;
    } else if (k === 'Enter' && gi >= 0) { playFromWord(gi); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    selectWord(gi, { quiet: true });
    const el = $('#stage .w[data-gi="' + gi + '"]'); if (el) vScroll(el, { block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  });
}

function bindRail() {
  $('#lys').addEventListener('click', (e) => { const b = e.target.closest('.ly'); if (b) toggleLayer(b.dataset.ly); });
  $('#presets').addEventListener('click', (e) => { const b = e.target.closest('.pre'); if (!b) return; setLayers(PRESETS.find((p) => p.id === b.dataset.pre).on); });
  $('#fsPlus').addEventListener('click', () => setFont(App.rs + 2));
  $('#fsMinus').addEventListener('click', () => setFont(App.rs - 2));
  $('#capR').addEventListener('input', (e) => { App.cap = +e.target.value; $('#capV').textContent = App.cap; store.set('cap', App.cap); clearTimeout(bindRail.t); bindRail.t = setTimeout(reanalyze, 200); });
  $('#sideClose').addEventListener('click', closeSide);
  $$('.stabs [data-pane]').forEach((b) => b.addEventListener('click', () => showPane(b.dataset.pane)));
}
function setFont(px) {
  App.rs = clamp(px, 16, 44); document.documentElement.style.setProperty('--rs', App.rs + 'px'); store.set('rs', App.rs);
}
