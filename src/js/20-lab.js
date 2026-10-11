/* ==========================================================================
   Yan panel: Sözcük laboratuvarı ve Cümle incelemesi (ton eğrisi, soluk planı)
   ========================================================================== */
const ALL_ON = LAYERS.map((l) => l.id).join(' ');
let LAB = { w: null, free: false };

function buildPanes() {
  $('#pane-word').innerHTML =
    '<form class="lab-try" id="labForm" autocomplete="off"><input id="labIn" type="text" spellcheck="false" aria-label="Sözcük dene" placeholder="Bir sözcük yaz, anında çözümlensin…"><button class="btn sm" type="submit">Çözümle</button></form>' +
    '<div id="labBody"></div>';
  $('#pane-sent').innerHTML = '<div id="sentBody"></div>';
  $('#labForm').addEventListener('submit', (e) => { e.preventDefault(); labTry($('#labIn').value); });
  let t = 0;
  $('#labIn').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => labTry(e.target.value, true), 140); });
  const body = $('#labBody');
  body.addEventListener('mouseover', (e) => {
    const r = e.target.closest('.rule');
    $$('#labBody .l.on, #stage .l.on').forEach((x) => x.classList.remove('on'));
    $$('#labBody .rule.hl').forEach((x) => x.classList.remove('hl'));
    if (r) { glowMark(r.dataset.m); return; }
    const l = e.target.closest('.l');
    if (l && l.dataset.m) { l.dataset.m.split(' ').forEach((id) => { const c = $('#labBody .rule[data-m="' + id + '"]'); if (c) c.classList.add('hl'); }); }
  });
  body.addEventListener('mouseleave', () => { $$('#labBody .l.on, #stage .l.on').forEach((x) => x.classList.remove('on')); $$('#labBody .rule.hl').forEach((x) => x.classList.remove('hl')); });
  body.addEventListener('click', (e) => {
    const l = e.target.closest('.lab-word .l');
    if (l && l.dataset.m) {
      const id = sortMarks(l.dataset.m.split(' ').map((x) => MARK_INDEX.get(x) || LABMARKS.get(x)).filter(Boolean).map((x) => x.m))[0];
      const c = id && $('#labBody .rule[data-m="' + id.id + '"]');
      if (c) { scrollWithin(c); c.classList.add('hl'); setTimeout(() => c.classList.remove('hl'), 1400); glowMark(id.id); }
      return;
    }
    const sim = e.target.closest('[data-sim]');
    if (sim) { $('#labIn').value = sim.dataset.sim; labShow(E.buildWord(sim.dataset.sim), { free: true }); return; }
    if (e.target.closest('[data-back]')) { $('#labIn').value = ''; if (App.selW >= 0) selectWord(App.selW, { quiet: true }); return; }
    const hs = e.target.closest('[data-hs]');
    if (hs) { hocaSetStress(LAB.w, +hs.dataset.hs); return; }
    const he = e.target.closest('[data-he]');
    if (he) { hocaToggleE(LAB.w, +he.dataset.he); return; }
    if (e.target.closest('[data-hince]')) { hocaToggleInce(LAB.w); return; }
    if (e.target.closest('[data-hclear]')) { hocaClear(LAB.w); return; }
  });
}

const LABMARKS = new Map();
/** yan panel kutusu içinde, öğeyi yalnızca gerekiyorsa kaydırarak göster */
function scrollWithin(el) {
  const box = $('#side'); if (!box || !el) return;
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
  const head = 52; // yapışkan sekme çubuğu
  // kart yeterince görünüyorsa kaydırma: sözcük başlığı kırpılmasın
  const visible = Math.min(r.bottom, b.bottom - 6) - Math.max(r.top, b.top + head);
  if (visible >= Math.min(r.height, 90)) return;
  box.scrollBy({ top: r.top - b.top - head - 12, behavior: REDUCED ? 'auto' : 'smooth' });
}
function glowMark(id) {
  $$('#labBody .l[data-m~="' + id + '"], #stage .w.sel .l[data-m~="' + id + '"]').forEach((x) => x.classList.add('on'));
}

function labTry(text, quiet) {
  const tok = String(text || '').trim().split(/\s+/)[0];
  if (!tok || !/[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/.test(tok)) { if (!tok && App.selW >= 0 && quiet) selectWord(App.selW, { quiet: true }); return; }
  labShow(E.buildWord(tok.replace(/^[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]+|[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]+$/g, '')), { free: true });
}

function renderLab(w, o) { labShow(w, o || {}); }

function ruleOrder(a, b) {
  const sa = a.sev === 'warn' ? 0 : 1, sb = b.sev === 'warn' ? 0 : 1;
  if (sa !== sb) return sa - sb;
  return PRIORITY.indexOf(a.layer) - PRIORITY.indexOf(b.layer);
}

const SIM = {
  N_M: ['sonbahar', 'onbeş', 'canbaz', 'kanbur', 'tenbih'],
  N_NG: ['renk', 'denk', 'bank', 'sünger', 'mangal', 'çengel'],
  INCE_EX: ['kalp', 'alkol', 'rol', 'gol', 'kâğıt', 'lâzım', 'hâlâ'],
  UNLU_UZUN: ['kâr', 'hâlâ', 'lâzım', 'hükûmet', 'kâğıt', 'âşık'],
  CIFT: ['anne', 'hissetmek', 'affetmek', 'tuttu'],
  KUME: ['tren', 'plan', 'spor', 'kırk', 'dört', 'Türkçe', 'sürdürülebilir'],
  YOR: ['geliyor', 'yapıyor', 'gidiyor', 'okuyor', 'biliyor']
};
function similarFor(w) {
  const cand = w.marks.filter((m) => m.at.length && ['unlu', 'n', 'kalin', 'ozel', 'zor', 'son', 'bag'].indexOf(m.layer) >= 0 && m.code !== 'ULAMA_ALAN').sort(ruleOrder);
  const m = cand.find((x) => x.layer !== 'son') || cand[0];
  if (!m) return null;
  let title = '', list = [];
  const L = w.letters[m.at[0]];
  const ch = L ? L.n : '';
  const bl = (BANK.letters && BANK.letters[ch]) || null;
  const fromLetter = () => bl ? [].concat(bl.start || [], bl.mid || [], bl.end || []) : [];
  switch (m.code) {
    case 'E_ACIK': title = 'açık e'; list = BANK.eOpen || []; break;
    case 'E_KAPALI': title = 'kapalı e'; list = BANK.eClosed || []; break;
    case 'E_KAPALI_ISTISNA': title = 'kapalı söylenen istisnalar'; list = ['kendi', 'hem', 'genç']; break;
    case 'N_M': title = 'n → m'; list = SIM.N_M; break;
    case 'N_NG': title = 'n → ng sesi'; list = SIM.N_NG; break;
    case 'UNLU_UZUN': title = 'uzun ünlü'; list = SIM.UNLU_UZUN; break;
    case 'IKI_UNLU': title = 'yan yana iki ünlü'; list = (BANK.vowelPairs || []).map((x) => x.word); break;
    case 'CIFT_UNSUZ': title = 'çift ünsüz'; list = SIM.CIFT; break;
    case 'SON_YOR': title = '-yor eki'; list = SIM.YOR; break;
    case 'ULAMA': title = 'ulama'; list = (BANK.liaison || []).map((x) => x.written); break;
    default:
      if (m.code.indexOf('KUME_') === 0) { title = 'zor ünsüz kümeleri'; list = SIM.KUME; }
      else if (/_INCE$/.test(m.code) && m.sev === 'tip') { title = 'ince söylenen alıntılar'; list = SIM.INCE_EX; }
      else { title = (L ? L.ch : '') + ' sesi'; list = fromLetter(); }
  }
  const self = w.norm;
  list = Array.from(new Set(list.map((x) => String(x).trim()).filter((x) => x && x.split(' ').length === 1 && E.trLower(x) !== self)));
  list = shuffle(list).slice(0, 8);
  return list.length ? { title, list } : null;
}

function labShow(w, o) {
  o = o || {};
  LAB = { w, free: !!o.free };
  LABMARKS.clear();
  const body = $('#labBody');
  if (!w || !w.letters.length) { body.innerHTML = '<div class="empty">' + ic('text') + '<b>Bir sözcük seç</b>Metindeki herhangi bir sözcüğe dokun; harfleri, hecesi ve kuralları burada açılır.</div>'; return; }
  w.marks.forEach((m) => LABMARKS.set(m.id, { m, w }));
  const rules = w.marks.filter((m) => m.code !== 'ULAMA_ALAN').slice().sort(ruleOrder);
  const sc = clamp(Math.round(w.score), 0, 5);
  const syl = w.syl.map((s, i) => w.stress.syl === i ? '<b>' + esc(E.sylText(w, i)) + '</b>' : esc(E.sylText(w, i))).join(' · ');
  let h = '';
  if (o.free && App.selW >= 0) h += '<div class="rrow" style="margin:-4px 0 6px"><button class="btn sm ghost" data-back type="button">' + ic('back') + 'Metindeki sözcüğe dön</button><span class="sp"></span><span class="pill">serbest sözcük</span></div>';
  h += '<div class="lab-top"><div class="lab-word stage" data-on="' + ALL_ON + '" aria-label="' + esc(w.text) + '">' + wordHTML(w, { lab: true }) + '</div></div>';
  h += '<div class="lab-sub">';
  h += '<span class="pill ipa" title="Okunuşu. ɛ = açık e · m, ŋ = n\'nin dönüşümü · ː = uzatma">' + esc(w.say) + '</span>';
  h += '<span class="pill">' + w.syl.length + ' hece</span>';
  h += '<span class="pill" title="Heceler; vurgulu hece kalın">' + syl + '</span>';
  h += '<span class="pill score" title="Zorluk">' + [0, 1, 2, 3, 4].map((i) => '<span class="d' + (i < sc ? ' on' : '') + '"></span>').join('') + '</span>';
  h += '</div>';
  if (w.stress.syl >= 0) h += '<p class="kisa" style="margin:-4px 0 4px"><b>Vurgu:</b> ' + (w.stress.syl + 1) + '. hece. ' + esc(w.stress.why) + ' <span class="cf ' + w.stress.conf + '">' + CONF[w.stress.conf] + '</span></p>';
  else h += '<p class="kisa" style="margin:-4px 0 4px"><b>Vurgu:</b> ' + esc(w.stress.why) + '</p>';
  if (w.group) h += '<p class="kisa" style="margin:6px 0 0">Metinde <b>' + esc(w.group.text) + '</b> yazıyor; okunuşu sözcük sözcük böyle.</p>';

  h += '<div class="sec-t">Kurallar · ' + rules.length + '</div><div class="rules">';
  rules.forEach((m, i) => {
    const col = markColor(m);
    h += '<div class="rule' + (m.sev === 'warn' ? ' sev-warn' : '') + '" style="--rc:var(' + col + ');--i:' + i + '" data-m="' + m.id + '">' +
      '<h4><span>' + esc(m.title) + '</span><span class="cf ' + m.conf + '">' + CONF[m.conf] + '</span></h4><p>' + esc(m.text) + '</p>' +
      (m.tip ? '<div class="how"><b>Nasıl:</b> ' + esc(m.tip) + '</div>' : '') +
      (m.ref ? '<div class="ref">Kılavuz · ' + esc(m.ref.sec) + ' · ' + esc(m.ref.card) + '</div>' : '') + '</div>';
  });
  h += '</div>';

  const sim = similarFor(w);
  if (sim) h += '<div class="sec-t">Aynı kural, başka sözcükler · ' + esc(sim.title) + '</div><div class="sims">' + sim.list.map((x) => '<button type="button" data-sim="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>';

  if (App.hoca.on && !o.free) h += hocaBoxHTML(w);
  body.innerHTML = h;
  if (o.focusMark) {
    const c = $('#labBody .rule[data-m="' + o.focusMark + '"]');
    if (c) { c.classList.add('hl'); setTimeout(() => { scrollWithin(c); glowMark(o.focusMark); }, 260); setTimeout(() => { c.classList.remove('hl'); $$('.l.on').forEach((x) => x.classList.remove('on')); }, 1900); }
  }
}

/* ---- Hoca modu ---- */
function hocaBoxHTML(w) {
  const key = w.norm;
  const uSt = App.hoca.stress[key];
  const eSet = App.hoca.eKapali[key] || [];
  let h = '<div class="hoca-box"><h4>' + ic('star') + 'Hoca notu · ' + esc(w.text) + '</h4>';
  if (w.syl.length > 1) {
    h += '<div class="row">Vurgulu hece: <span class="seg">' + w.syl.map((s, i) => '<button type="button" data-hs="' + i + '" aria-pressed="' + (w.stress.syl === i ? 'true' : 'false') + '">' + esc(E.sylText(w, i)) + '</button>').join('') + '</span></div>';
  }
  const eMarks = w.marks.filter((m) => m.code === 'E_ACIK' || m.code === 'E_KAPALI_ISTISNA');
  eMarks.forEach((m) => {
    const si = w.letters[m.at[0]].syl;
    const on = m.code === 'E_KAPALI_ISTISNA' || eSet.indexOf(si) >= 0;
    h += '<div class="row">“' + esc(E.sylText(w, si)) + '” hecesindeki e: <span class="seg"><button type="button" data-he="' + si + '" aria-pressed="' + (!on ? 'true' : 'false') + '">açık</button><button type="button" data-he="' + si + '" aria-pressed="' + (on ? 'true' : 'false') + '">kapalı</button></span></div>';
  });
  if (/l/.test(w.norm)) {
    const on = App.hoca.ince.indexOf(key) >= 0;
    h += '<div class="row"><label for="hinc">Bu sözcükte l ince söylensin</label><input class="swt" id="hinc" data-hince type="checkbox"' + (on ? ' checked' : '') + '></div>';
  }
  const has = uSt != null || eSet.length || App.hoca.ince.indexOf(key) >= 0;
  h += '<div class="row"><button class="btn sm ghost" type="button" data-hclear' + (has ? '' : ' disabled') + '>Bu sözcüğün notunu sil</button><span class="mut">Not, tüm metinde bu sözcük için geçerli olur.</span></div></div>';
  return h;
}
function hocaApply(w) {
  saveHoca();
  const gi = w.gi;
  reanalyze();
  if (gi != null && App.A.words[gi]) selectWord(gi, { quiet: true });
  toast('Hoca notu kaydedildi', 1500);
}
function hocaSetStress(w, idx) { if (!w) return; App.hoca.stress[w.norm] = idx; hocaApply(w); }
function hocaToggleE(w, si) {
  if (!w) return;
  const key = w.norm, arr = App.hoca.eKapali[key] || [];
  const i = arr.indexOf(si);
  if (i >= 0) arr.splice(i, 1); else arr.push(si);
  if (arr.length) App.hoca.eKapali[key] = arr; else delete App.hoca.eKapali[key];
  hocaApply(w);
}
function hocaToggleInce(w) {
  if (!w) return;
  const i = App.hoca.ince.indexOf(w.norm);
  if (i >= 0) App.hoca.ince.splice(i, 1); else App.hoca.ince.push(w.norm);
  hocaApply(w);
}
function hocaClear(w) {
  if (!w) return;
  delete App.hoca.stress[w.norm]; delete App.hoca.eKapali[w.norm];
  App.hoca.ince = App.hoca.ince.filter((x) => x !== w.norm);
  hocaApply(w);
}

/* ---- Cümle incelemesi ---- */
function sentenceText(S) {
  const out = [];
  S.words.forEach((w, i) => {
    let t = '';
    if (w.group) { if (w.group.i === 0) t = w.group.text; else if (!(i > 0 && S.words[i - 1].group && S.words[i - 1].group.id === w.group.id)) t = w.text; else t = ''; }
    else t = w.text;
    const pre = (w.pre || []).map((q) => q.ch).join('');
    const post = (!w.group || w.group.i === w.group.n - 1) ? w.post.map((p) => p.ch).join('') : '';
    if (t || post) out.push(pre + t + post);
  });
  return out.join(' ');
}

const TONE_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="toneGrad" x1="0" x2="1"><stop offset="0" stop-color="var(--c-ince)"/><stop offset=".55" stop-color="var(--c-vurgu)"/><stop offset="1" stop-color="var(--c-acik)"/></linearGradient><linearGradient id="toneArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c-vurgu)" stop-opacity=".24"/><stop offset="1" stop-color="var(--c-vurgu)" stop-opacity="0"/></linearGradient></defs></svg>';

/** tek ifadenin (iki durak arası) ton şeridi */
function toneRow(S, pts, lo, hi) {
  const n = pts.length;
  const W = 340, H = 104, padX = 18, top = 12, bot = 26;
  const UW = W - 2 * padX;
  const sp = n > 1 ? Math.min(44, UW / (n - 1)) : 0;
  const x0 = n > 1 ? padX : W / 2;
  const X = (i) => x0 + i * sp;
  const Y = (p) => top + (hi - p) / (hi - lo) * (H - top - bot);
  const P = pts.map((x, i) => [X(i), Y(x.p)]);
  let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ',' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  const base = H - bot + 2;
  const area = d + ' L' + P[n - 1][0].toFixed(1) + ' ' + base + ' L' + P[0][0].toFixed(1) + ' ' + base + ' Z';
  let s = '<svg class="tone" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Ton şeridi: perde hece hece">';
  s += '<line class="grid" x1="' + padX + '" x2="' + (W - padX) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '"/>';
  if (n > 1) s += '<path class="area" d="' + area + '"/>';
  let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  if (n > 1) s += '<path class="curve" style="--len:' + Math.ceil(len * 1.3 + 40) + '" d="' + d + '"/>';
  s += '<line class="cur" x1="0" x2="0" y1="' + (top - 6) + '" y2="' + base + '"/>';
  const fw = S.focus ? S.focus.wi : -1;
  pts.forEach((x, i) => {
    const stress = x.w.stress.syl === x.k, focus = x.wi === fw && stress;
    const r = focus ? 6.5 : stress ? 5 : 3.2;
    const col = focus ? 'var(--c-vurgu)' : stress ? 'var(--c-acik)' : 'var(--ink3)';
    s += '<circle class="dot" data-g="' + x.w.gi + ':' + x.k + '" cx="' + P[i][0].toFixed(1) + '" cy="' + P[i][1].toFixed(1) + '" r="' + r + '" stroke="' + col + '" fill="' + (focus ? 'var(--c-vurgu)' : 'var(--bg1)') + '"><title>' + esc(E.sylText(x.w, x.k)) + (stress ? ' (vurgulu)' : '') + '</title></circle>';
  });
  const byW = {};
  pts.forEach((x, i) => { (byW[x.wi] = byW[x.wi] || []).push(i); });
  Object.keys(byW).forEach((wi) => {
    const ix = byW[wi], w = S.words[wi];
    const cx = (X(ix[0]) + X(ix[ix.length - 1])) / 2;
    const span = Math.max(sp, 16) * ix.length;
    const chars = Math.floor(span / 6.4);
    let lab = w.text;
    if (lab.length > chars) lab = chars >= 4 ? lab.slice(0, chars - 1) + '…' : chars >= 2 ? lab.slice(0, chars) : '';
    if (lab) s += '<text class="wl' + (+wi === fw ? ' f' : '') + '" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab) + '</text>';
  });
  return s + '</svg>';
}

function renderSentPane(S) {
  const body = $('#sentBody');
  if (!S) { body.innerHTML = '<div class="empty">' + ic('wave') + '<b>Bir cümle seç</b>Soldaki numaraya ya da bir sözcüğe dokun.</div>'; return; }
  const k = KIND[S.kind] || KIND.bildirme;
  const diff = S.score <= 0.8 ? 'Kolay' : S.score <= 1.5 ? 'Orta' : 'Zor';
  const fw = S.focus ? S.words[S.focus.wi] : null;
  let h = '<div class="sp-text">' + esc(sentenceText(S)) + '</div>';
  h += '<div class="rrow" style="padding:0;gap:6px;flex-wrap:wrap"><button class="btn sm pri" type="button" data-play-s="' + S.index + '">' + ic('play') + 'Bu cümleyi oku</button><button class="btn sm" type="button" data-loop-s="' + S.index + '">' + ic('loop') + '3 kez</button></div>';
  h += '<div class="mini-k"><div><b>' + S.stats.words + '</b><span>sözcük</span></div><div><b>' + S.stats.syl + '</b><span>hece</span></div><div><b>' + diff + '</b><span>zorluk</span></div></div>';
  h += '<div class="sec-t">Cümle türü</div><div class="kinds" role="group" aria-label="Cümle türü">' + Object.keys(KIND).map((id) => '<button type="button" data-kind="' + id + '" aria-pressed="' + (S.kind === id ? 'true' : 'false') + '">' + KIND[id].name + (S.kindAuto === id ? '<span class="a">oto</span>' : '') + '</button>').join('') + '</div>';
  h += '<p class="kisa" style="margin-top:6px">' + esc(k.hint) + '</p>';
  if (fw) h += '<div class="focus-note"><b>Vurgu odağı: ' + esc(fw.text) + '.</b> ' + esc(S.focus.why) + ' <span class="cf egilim">Genel eğilim</span></div>';
  // ifade ifade ton şeridi + soluk yükü
  const cap = App.cap, pts = E.pitchPlan(S);
  const ps = pts.map((x) => x.p);
  const lo = Math.min(-0.45, Math.min.apply(null, ps)), hi = Math.max(0.75, Math.max.apply(null, ps));
  h += '<div class="sec-t">Ton ve soluk · ' + S.phrases.length + ' ifade</div>' + TONE_DEFS + '<div class="phr">';
  S.phrases.forEach((ph, i) => {
    const txt = S.words.slice(ph.from, ph.to + 1).map((w) => w.text).join(' ');
    const fill = clamp(ph.syl / cap, 0, 1);
    const br = ph.end ? ph.end.name + ' · ≈ ' + trNum(ph.end.ms / 1000, 1) + ' sn' + (ph.end.soluk === true ? ' · soluk' : ph.end.soluk === 'mumkun' ? ' · soluk mümkün' : '') : '';
    const mine = pts.filter((x) => x.ph === i);
    // uzun ifadeleri sözcük sınırlarından satırlara böl (en çok 13 hece)
    const chunks = []; let cur = [], curW = -1, curN = 0, wordBuf = [];
    const flushWord = () => { if (!wordBuf.length) return; if (cur.length && curN + wordBuf.length > 13) { chunks.push(cur); cur = []; curN = 0; } cur = cur.concat(wordBuf); curN += wordBuf.length; wordBuf = []; };
    mine.forEach((x) => { if (x.wi !== curW) { flushWord(); curW = x.wi; } wordBuf.push(x); });
    flushWord(); if (cur.length) chunks.push(cur);
    h += '<div class="p' + (ph.syl > cap ? ' over' : '') + '" style="--fill:' + fill.toFixed(2) + '"><div class="ph-h"><span class="tx">' + esc(txt) + '</span><span class="br">' + esc(br) + '</span></div>' + chunks.map((c) => toneRow(S, c, lo, hi)).join('') +
      '<div class="bar" title="' + ph.syl + ' hece · soluk kapasitesi ' + cap + '"><i></i></div>' + (ph.suggest ? '<div class="sug">⌄ ' + esc(ph.suggest.why) + '</div>' : '') + '</div>';
  });
  h += '</div><p class="kisa" style="margin-top:8px">Şeritler perdenin hece hece nasıl gezineceğini <b>öneri</b> olarak gösterir: açık noktalar vurgulu heceler, altın nokta cümle odağı. Alttaki çubuk, ifadenin soluk kapasitesinin ne kadarını harcadığını gösterir.</p>';
  if (S.breathAlerts && S.breathAlerts.length) h += '<p class="kisa" style="margin-top:8px;color:var(--bad)"><b>Soluk uyarısı:</b> ' + esc(S.breathAlerts[0].why) + '</p>';
  if (S.alliteration) h += '<p class="kisa" style="margin-top:8px"><b>Ses yoğunluğu:</b> sözcüklerin ' + S.alliteration.count + ' tanesi “' + esc(S.alliteration.letter) + '” ile başlıyor; tekerleme gibi çalış: önce yavaş, sonra hızlan.</p>';
  body.innerHTML = h;
  // çubuk dolum animasyonu
  requestAnimationFrame(() => $$('#sentBody .phr .bar i').forEach((i) => { i.style.width = 'calc(var(--fill)*100%)'; }));
}

function bindSentPane() {
  $('#pane-sent').addEventListener('click', (e) => {
    const kb = e.target.closest('[data-kind]');
    if (kb && App.selS >= 0) {
      const S = App.A.sentences[App.selS], id = kb.dataset.kind;
      S.kind = id;
      if (id === S.kindAuto) delete App.kinds[S.index]; else App.kinds[S.index] = id;
      rerenderSentence(S.index); renderSentPane(S); invalidatePlan();
      return;
    }
    const ps = e.target.closest('[data-play-s]'); if (ps) { playSentence(+ps.dataset.playS, false); return; }
    const ls = e.target.closest('[data-loop-s]'); if (ls) { playSentence(+ls.dataset.loopS, 3); return; }
  });
  // ton eğrisi noktasından sözcük seç
  $('#pane-sent').addEventListener('click', (e) => {
    const d = e.target.closest('.tone .dot'); if (!d) return;
    const gi = +d.dataset.g.split(':')[0];
    selectWord(gi, { quiet: true });
  });
}
