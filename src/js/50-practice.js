/* ==========================================================================
   Alıştırma: harf harf çalışma, kelime avı, hazır metinler, Hoca notları
   ========================================================================== */
const VOWEL_LETTERS = 'aeıioöuü'.split('');
const CONS_LETTERS = 'bcçdfgğhjklmnoprsştvyz'.replace('o', '').split('');
const PS = { letter: '', mode: 'home' };

function renderPractice() {
  const root = $('#practice');
  const letters = BANK.letters || {};
  const lbtn = (c) => letters[c] ? '<button type="button" data-letter="' + c + '" class="' + (VOWEL_LETTERS.indexOf(c) >= 0 ? 'v' : '') + '" aria-pressed="' + (PS.letter === c ? 'true' : 'false') + '">' + c + '</button>' : '';
  let h = '<h2>Alıştırma</h2><p class="sub">Önce bir harfi ya da kuralı seç, örneklerini incele; sonra metni sahneye alıp karaoke ile oku. Kelime avıyla da kendini sına.</p>';
  h += '<div id="huntArea" hidden></div><div id="pHome">';
  // harf harf
  h += '<div class="pcard" style="margin-bottom:14px" id="cardLetters"><div class="ico" style="--pc:var(--c-acik)">' + ic('text') + '</div><h3>Harf harf çalış</h3><p>Kılavuzdaki harf kartlarından: nasıl çıkar, nerede dikkat edilir, hangi sözcüklerle çalışılır.</p>' +
    '<div class="lgrid" id="lgrid">' + VOWEL_LETTERS.map(lbtn).join('') + CONS_LETTERS.map(lbtn).join('') + '</div>' +
    '<div class="drill-out" id="drill" hidden></div></div>';
  h += '<div class="pgrid">';
  // kelime avı
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-vurgu)">' + ic('target') + '</div><h3>Kelime avı</h3><p>Vurgulu heceyi, açık-kapalı e’yi, n’nin sesini, kalın-ince l-k-g’yi bul. Doğru cevaplar motorun kurallarına göre denetlenir.</p>' +
    '<div class="optrow" id="huntMode" role="group" aria-label="Soru türü">' + [['karisik', 'Karışık'], ['vurgu', 'Vurgu'], ['e', 'Açık / kapalı e'], ['n', 'n sesi'], ['kalin', 'Kalın / ince']].map((x, i) => '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="optrow" id="huntSrc" role="group" aria-label="Sözcük kaynağı"><button type="button" data-v="text" aria-pressed="true">Metnimden</button><button type="button" data-v="bank" aria-pressed="false">Kılavuzdan</button></div>' +
    '<div><button class="btn pri" id="huntGo" type="button">' + ic('play') + 'Başla</button></div></div>';
  // hazır metinler
  const texts = BANK.texts || {};
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-ince)">' + ic('book') + '</div><h3>Okuma metinleri</h3><p>Kılavuzdaki okuma çalışmaları. Sahneye al, katmanları aç, karaoke ile oku.</p><div class="optrow" id="textList">' +
    Object.keys(texts).map((k, i) => '<button type="button" data-text="' + i + '">' + esc(k.replace(/\s*\(.*\)/, '')) + '</button>').join('') +
    '<button type="button" data-work="1">İş yeri cümleleri</button><button type="button" data-num="1">Sayı, tarih ve kısaltma</button></div></div>';
  // tekerleme / grup
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-n)">' + ic('wave') + '</div><h3>Ses grupları ve tekerlemeler</h3><p>Aynı sesleri toplayan çalışmalar: hece dizileri, sözcükler, cümleler, tekerlemeler.</p><div class="optrow" id="groupList">' +
    (BANK.groups || []).map((g, i) => '<button type="button" data-group="' + i + '">' + esc(g.title.replace(/^.*?:\s*/, g.no === 9 ? '' : '').replace(/^Karışık tekerlemeler$/, 'Karışık tekerlemeler')) + '</button>').join('') + '</div></div>';
  // ulama
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-bag)">' + ic('link') + '</div><h3>Ulama</h3><p>Ünsüzle biten sözcük, ünlüyle başlayanla bağlanır. Soldaki yazılışı sağdaki gibi okumaya çalış.</p><div class="rules" style="gap:6px">' +
    (BANK.liaison || []).slice(0, 5).map((x) => '<div class="rule" style="--rc:var(--c-bag);padding:8px 12px 8px 16px"><h4 style="margin:0"><span>' + esc(x.written) + '</span><span class="mut" style="font-weight:500;font-size:.85rem">→ ' + esc(x.spoken) + '</span></h4></div>').join('') + '</div>' +
    '<div><button class="btn sm" type="button" id="liaisonGo">Hepsini sahneye al</button></div></div>';
  // karıştırılan ünlüler
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-kapali)">' + ic('shuffle') + '</div><h3>Karıştırılan ünlüler</h3><p>ı–i, o–ö, u–ü, a–e ayrımı. Çiftleri art arda okuyup farkı kulağınla yakala.</p><div class="optrow" id="confList">' +
    (BANK.confusables || []).map((c, i) => '<button type="button" data-conf="' + i + '">' + esc(c.pair.replace(/\s/g, '')) + '</button>').join('') + '</div></div>';
  // sık yanlışlar
  h += '<div class="pcard"><div class="ico" style="--pc:var(--c-hata)">' + ic('list') + '</div><h3>Sık yanlış söylenenler</h3><p>Kılavuzun hata listesi. Metninde geçerse sahnede kırmızıyla işaretlenir.</p><div class="rules" style="gap:5px">' +
    (BANK.mistakes || []).slice(0, 6).map((m) => '<div class="rule" style="--rc:var(--c-hata);padding:7px 12px 7px 16px"><h4 style="margin:0"><span class="mut" style="text-decoration:line-through">' + esc(m.wrong) + '</span><span>' + esc(m.right) + '</span></h4></div>').join('') + '</div>' +
    '<div><button class="btn sm" type="button" id="mistGo">Hepsini sahneye al</button></div></div>';
  // hoca
  h += '<div class="pcard"><div class="ico" style="--pc:var(--brand)">' + ic('star') + '</div><h3>Hoca modu</h3><p>Hocanın söylediği istisnaları (vurgu, kapalı e, ince l) sözcük sözcük kaydet. Uygulama bundan sonra sana onun söyleyişini gösterir. Notlar yalnızca bu tarayıcıda durur.</p>' +
    '<div class="rrow" style="padding:0"><label for="swHoca2">Hoca modu açık</label><span class="sp"></span><input class="swt" id="swHoca2" type="checkbox"' + (App.hoca.on ? ' checked' : '') + '></div>' +
    '<div><button class="btn sm" type="button" id="hocaOpen">★ Notlarım (' + hocaCount() + ')</button></div></div>';
  h += '</div></div>';
  root.innerHTML = h;
  bindPractice();
}

function loadDrill(text, title) {
  $('#inp').value = text;
  App.title = title || '';
  analyzeAndShow(text, { title });
}

function drillFor(ch) {
  const info = (BANK.letters || {})[ch]; if (!info) return;
  PS.letter = ch;
  $$('#lgrid button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.letter === ch ? 'true' : 'false'));
  const out = $('#drill'); out.hidden = false;
  const chips = (arr) => arr.length ? '<div class="sims">' + arr.map((x) => '<button type="button" data-mini="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '';
  let h = '<h4>' + esc(info.title) + '</h4><p class="how">' + esc(info.how) + '</p>';
  if (info.careful) h += '<div class="focus-note" style="margin-top:10px"><b>Dikkat:</b> ' + esc(info.careful) + '</div>';
  const row = (t, arr) => arr.length ? '<div class="sec-t">' + t + '</div>' + chips(arr) : '';
  h += row('Başta', info.start || []) + row('Ortada', info.mid || []) + row('Sonda', info.end || []);
  if (info.pairs && info.pairs.length) h += '<div class="sec-t">Karşılaştır</div><div class="sims">' + info.pairs.map((p) => '<button type="button" data-mini="' + esc(p[0]) + '" data-mini2="' + esc(p[1]) + '">' + esc(p[0]) + ' – ' + esc(p[1]) + '</button>').join('') + '</div>';
  if (info.syl) h += '<div class="sec-t">Hece dizisi</div><p class="how" style="font-family:var(--font-read);font-size:1.05rem">' + esc(info.syl) + '</p>';
  if (info.sentence) h += '<div class="sec-t">Cümle</div><p class="how" style="font-family:var(--font-read);font-size:1.1rem">' + esc(info.sentence) + '</p>';
  h += '<div id="miniLab"></div>';
  h += '<div class="acts"><button class="btn pri" type="button" data-load="all">' + ic('play') + 'Hepsini sahneye al</button>' + (info.sentence ? '<button class="btn" type="button" data-load="sent">Yalnız cümleyi al</button>' : '') + '<button class="btn ghost" type="button" data-load="hunt">Bu harfle kelime avı</button></div>';
  out.innerHTML = h;
  vScroll(out, { block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
}

function drillText(ch) {
  const i = BANK.letters[ch], parts = [];
  const line = (arr) => arr && arr.length ? arr.join(', ') + '.' : '';
  parts.push(line(i.start), line(i.mid), line(i.end));
  if (i.pairs && i.pairs.length) parts.push(i.pairs.map((p) => p[0] + ', ' + p[1]).join('; ') + '.');
  if (i.sentence) parts.push(i.sentence);
  return parts.filter(Boolean).join('\n\n');
}

function miniLab(words) {
  const box = $('#miniLab'); if (!box) return;
  box.innerHTML = '<div class="sec-t">Çözümleme</div>' + words.map((tx) => {
    const w = E.buildWord(tx);
    const rules = w.marks.filter((m) => m.layer !== 'vurgu' && m.code !== 'ULAMA_ALAN').sort(ruleOrder).slice(0, 3);
    return '<div style="margin-bottom:10px"><div class="lab-word stage" data-on="' + ALL_ON + '" style="font-size:2.3rem;padding-top:.4em">' + wordHTML(w, { lab: true }) + '</div>' +
      '<div class="lab-sub"><span class="pill ipa">' + esc(w.say) + '</span><span class="pill">' + w.syl.length + ' hece</span></div>' +
      '<div class="rules">' + rules.map((m, i) => '<div class="rule" style="--rc:var(' + markColor(m) + ');--i:' + i + '"><h4><span>' + esc(m.title) + '</span><span class="cf ' + m.conf + '">' + CONF[m.conf] + '</span></h4><p>' + esc(m.text) + '</p></div>').join('') + '</div></div>';
  }).join('');
  vScroll(box, { block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
}

function practiceFocus(t) {
  if (t.letter) { drillFor(t.letter); const b = $('#lgrid [data-letter="' + t.letter + '"]'); if (b) vScroll(b, { block: 'center' }); }
  else if (t.twisters) { const el = $('#groupList'); if (el) { vScroll(el, { block: 'center' }); el.animate([{ outline: '2px solid transparent' }, { outline: '2px solid var(--brand)' }, { outline: '2px solid transparent' }], { duration: 1400 }); } }
  else if (t.liaison) { const el = $('#liaisonGo'); if (el) vScroll(el, { block: 'center' }); }
  else if (t.mistakes) { const el = $('#mistGo'); if (el) vScroll(el, { block: 'center' }); }
}

function bindPractice() {
  const root = $('#practice');
  const seg = (sel) => $(sel).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', $(sel)).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
  seg('#huntMode'); seg('#huntSrc');
  $('#lgrid').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) drillFor(b.dataset.letter); });
  $('#drill').addEventListener('click', (e) => {
    const mini = e.target.closest('[data-mini]');
    if (mini) { miniLab(mini.dataset.mini2 ? [mini.dataset.mini, mini.dataset.mini2] : [mini.dataset.mini]); return; }
    const ld = e.target.closest('[data-load]');
    if (!ld) return;
    const info = BANK.letters[PS.letter];
    if (ld.dataset.load === 'all') loadDrill(drillText(PS.letter), PS.letter + ' harfi alıştırması');
    else if (ld.dataset.load === 'sent') loadDrill(info.sentence, PS.letter + ' harfi cümlesi');
    else if (ld.dataset.load === 'hunt') startHunt({ letter: PS.letter });
  });
  $('#huntGo').addEventListener('click', () => startHunt({}));
  $('#textList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const texts = BANK.texts || {}, keys = Object.keys(texts);
    if (b.dataset.text != null) loadDrill(texts[keys[+b.dataset.text]], keys[+b.dataset.text].replace(/\s*\(.*\)/, ''));
    else if (b.dataset.work) loadDrill((BANK.workSentences || []).join('\n\n'), 'İş yeri cümleleri');
    else if (b.dataset.num) loadDrill(SAMPLE_NUM, 'Sayı, tarih ve kısaltma');
  });
  $('#groupList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const g = BANK.groups[+b.dataset.group], parts = [];
    if (g.words) parts.push(g.words + '.');
    (g.sentences || []).forEach((s) => parts.push(s));
    (g.twisters || []).forEach((s) => parts.push(s));
    if (g.pairs && g.pairs.trim()) parts.push(g.pairs.trim());
    loadDrill(parts.join('\n\n'), g.title);
  });
  $('#confList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = BANK.confusables[+b.dataset.conf];
    loadDrill(c.items.map((x) => x.replace(/\s*[–-]\s*/, ', ') + '.').join('\n\n'), c.pair);
  });
  $('#liaisonGo').addEventListener('click', () => loadDrill((BANK.liaison || []).map((x) => x.written.replace(/\s*\(.*\)/, '') + '.').join('\n\n'), 'Ulama'));
  $('#mistGo').addEventListener('click', () => loadDrill((BANK.mistakes || []).map((m) => m.right + '.').join('\n'), 'Sık yanlış söylenenler'));
  $('#swHoca2').addEventListener('change', (e) => setHoca(e.target.checked));
  $('#hocaOpen').addEventListener('click', openHocaDialog);
}

const SAMPLE_NUM = 'Toplantı 14.30\'da başlayacak. Dr. Ayşe Yılmaz, 25 Mart 2026 tarihinde %15 zam açıkladı.\n\nBu yıl 1.250 kişiye ulaştık; hedefimiz 2 milyon 500 bin liralık satış.';

/* ================= Kelime avı ================= */
const Q = { list: [], i: 0, score: 0, streak: 0, best: 0, stats: {}, answered: false, wrong: [], opts: {} };
const TYPE_NAME = { vurgu: 'Vurgu', e: 'Açık / kapalı e', n: 'n sesi', kalin: 'Kalın / ince' };

function poolWords(src, letter) {
  let words = [];
  if (src === 'text' && App.A) {
    const seen = new Set();
    App.A.words.forEach((w) => { if (!seen.has(w.norm) && w.letters.length >= 2 && !w.group) { seen.add(w.norm); words.push(w); } });
  }
  if (words.length < 10 || src === 'bank') {
    const raw = [];
    const L = BANK.letters || {};
    Object.keys(L).forEach((k) => { if (letter && k !== letter) return; raw.push.apply(raw, [].concat(L[k].start || [], L[k].mid || [], L[k].end || [])); });
    if (!letter) raw.push.apply(raw, [].concat(BANK.eOpen || [], BANK.eClosed || [], SIM.N_M, SIM.N_NG, SIM.INCE_EX, ['geliyor', 'yapıyor', 'sonbahar', 'kalem', 'defter', 'Ankara', 'öğretmen', 'kitaplık']));
    else raw.push.apply(raw, [].concat(letter === 'n' ? SIM.N_M.concat(SIM.N_NG) : [], letter === 'e' ? (BANK.eOpen || []).concat(BANK.eClosed || []) : []));
    const seen = new Set(words.map((w) => w.norm));
    raw.forEach((x) => { const t = String(x).trim(); if (!t || /\s/.test(t) || /[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’-]/.test(t)) return; const w = E.buildWord(t); if (w.letters.length >= 2 && !seen.has(w.norm)) { seen.add(w.norm); words.push(w); } });
  }
  return words;
}

function buildQuestion(type, words, letter) {
  const tries = shuffle(words);
  for (const w of tries) {
    if (type === 'vurgu') {
      if (w.syl.length >= 2 && w.syl.length <= 6 && w.stress.syl >= 0 && !w.flags.clitic) return { type, w, ans: w.stress.syl, why: w.stress.why, ref: { sec: 'Bölüm 8', card: 'Kelime vurgusu' }, conf: w.stress.conf };
    } else if (type === 'e') {
      const ms = w.marks.filter((m) => m.code === 'E_ACIK' || m.code === 'E_KAPALI' || m.code === 'E_KAPALI_ISTISNA');
      if (ms.length) { const m = pick(ms); return { type, w, idx: m.at[0], ans: m.code === 'E_ACIK' ? 'acik' : 'kapali', why: m.text, tip: m.tip, ref: m.ref, conf: m.conf }; }
    } else if (type === 'n') {
      const nm = w.marks.find((m) => m.code === 'N_M' || m.code === 'N_NG');
      if (nm) return { type, w, idx: nm.at[0], ans: nm.code === 'N_M' ? 'm' : 'ng', why: nm.text, tip: nm.tip, ref: nm.ref, conf: nm.conf };
      const ni = w.letters.findIndex((L, i) => L.n === 'n' && i < w.letters.length - 1 && !w.marks.some((m) => (m.code === 'N_M' || m.code === 'N_NG') && m.at[0] === i));
      if (ni >= 0 && Math.random() < 0.45) return { type, w, idx: ni, ans: 'n', why: 'n burada kendi sesiyle söylenir: yanında b, p, k, g yok.', tip: 'n’yi yutma, dil ucunu üst diş etine değdir.', ref: { sec: 'Bölüm 6', card: 'n kartı' }, conf: 'kesin' };
    } else if (type === 'kalin') {
      const ms = w.marks.filter((m) => /_(INCE|KALIN)$/.test(m.code));
      if (ms.length) { const m = pick(ms); return { type, w, idx: m.at[0], ans: /_INCE$/.test(m.code) ? 'ince' : 'kalin', why: m.text, tip: m.tip, ref: m.ref, conf: m.conf }; }
    }
  }
  return null;
}

function startHunt(o) {
  const mode = ($('#huntMode [aria-pressed="true"]') || {}).dataset ? $('#huntMode [aria-pressed="true"]').dataset.v : 'karisik';
  const src = ($('#huntSrc [aria-pressed="true"]') || {}).dataset ? $('#huntSrc [aria-pressed="true"]').dataset.v : 'text';
  const letter = o.letter || '';
  const pool = poolWords(src, letter);
  if (src === 'text' && !App.A) toast('Metin yok; kılavuzdaki sözcüklerle başlıyorum.', 2200);
  const types = mode === 'karisik' ? ['vurgu', 'e', 'n', 'kalin'] : [mode];
  const list = [];
  let guard = 0, t = 0;
  while (list.length < 10 && guard++ < 80) {
    const type = types[t++ % types.length];
    const q = buildQuestion(type, pool, letter);
    if (q && !list.some((x) => x.w.norm === q.w.norm && x.type === q.type)) list.push(q);
  }
  if (list.length < 3) { toast('Bu seçimle yeterli soru çıkmadı; başka bir tür dene.', 2800); return; }
  Object.assign(Q, { list, i: 0, score: 0, streak: 0, best: 0, stats: {}, answered: false, wrong: [], opts: { mode, src, letter } });
  $('#pHome').hidden = true; $('#huntArea').hidden = false;
  renderQuestion();
}
function endHunt() { $('#huntArea').hidden = true; $('#pHome').hidden = false; $('#huntArea').innerHTML = ''; }

function renderQuestion() {
  const area = $('#huntArea'), q = Q.list[Q.i];
  if (!q) { renderHuntEnd(); return; }
  Q.answered = false;
  const w = q.w;
  let h = '<div class="hunt"><div class="hunt-bar"><button class="btn sm ghost" type="button" id="huntBack">' + ic('back') + 'Çık</button><div class="track"><i style="width:' + (Q.i / Q.list.length * 100) + '%"></i></div><span class="streak" title="Üst üste doğru">' + (Q.streak > 1 ? '🔥 ' + Q.streak : '') + '</span><span class="score num">' + Q.score + '/' + Q.list.length + '</span></div>';
  h += '<div class="q"><div class="qk">Soru ' + (Q.i + 1) + ' / ' + Q.list.length + ' · ' + TYPE_NAME[q.type] + '</div>';
  if (q.type === 'vurgu') {
    h += '<div class="qt">Vurgulu hece hangisi?</div><div class="qw" id="qw">' + w.syl.map((s, i) => '<button type="button" data-a="' + i + '">' + esc(E.sylText(w, i)) + '</button>').join('<span style="opacity:.3">·</span>') + '</div>';
  } else {
    const qs = { e: 'Altı çizili e nasıl söylenir?', n: 'Altı çizili n nasıl söylenir?', kalin: 'Altı çizili harf kalın mı, ince mi söylenir?' }[q.type];
    const ltr = w.letters.map((L, i) => (i === q.idx ? '<button type="button" class="pick" tabindex="-1" disabled>' + esc(L.ch) + '</button>' : '<span>' + esc(L.ch) + '</span>')).join('');
    const opts = { e: [['acik', 'Açık e'], ['kapali', 'Kapalı e']], n: [['n', 'n'], ['m', 'm'], ['ng', 'ng sesi']], kalin: [['kalin', 'Kalın'], ['ince', 'İnce']] }[q.type];
    h += '<div class="qt">' + qs + '</div><div class="qw" id="qw">' + ltr + '</div><div class="opts">' + opts.map((o) => '<button type="button" data-a="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
  }
  h += '<div id="fb"></div></div></div>';
  area.innerHTML = h;
  $('#huntBack').addEventListener('click', endHunt);
  area.querySelector('.q').addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b || Q.answered) return;
    answerQuestion(b);
  });
}

function answerQuestion(btn) {
  const q = Q.list[Q.i]; Q.answered = true;
  const given = btn.dataset.a;
  const ok = q.type === 'vurgu' ? (+given === q.ans) : (given === q.ans);
  const st = Q.stats[q.type] || (Q.stats[q.type] = { ok: 0, n: 0 });
  st.n++;
  if (ok) { Q.score++; Q.streak++; st.ok++; Q.best = Math.max(Q.best, Q.streak); } else { Q.streak = 0; Q.wrong.push(q); }
  btn.classList.add(ok ? 'good' : 'bad');
  $$('#huntArea [data-a]').forEach((b) => {
    const right = q.type === 'vurgu' ? (+b.dataset.a === q.ans) : (b.dataset.a === q.ans);
    if (right) b.classList.add('good');
    if (b.tagName === 'BUTTON' && b.closest('.opts')) b.disabled = true;
  });
  const w = q.w;
  let fb = '<div class="fb"><b>' + (ok ? pick(['Doğru!', 'Tam isabet.', 'Güzel kulak.', 'Evet.']) : 'Bu sefer değil.') + '</b> ' + esc(q.why) + (q.tip ? ' <span class="mut">' + esc(q.tip) + '</span>' : '') +
    ' <span class="cf ' + q.conf + '">' + CONF[q.conf] + '</span>' + (q.ref ? '<div class="mut" style="font-size:.78rem;margin-top:4px">Kılavuz · ' + esc(q.ref.sec) + ' · ' + esc(q.ref.card) + '</div>' : '') +
    '<div class="lab-word stage" data-on="' + ALL_ON + '" style="font-size:2.2rem;padding-top:.45em">' + wordHTML(w, { lab: true }) + '</div>' +
    '<div class="acts"><button class="btn pri" type="button" id="qNext">' + (Q.i + 1 >= Q.list.length ? 'Sonucu gör' : 'Sonraki') + '</button></div></div>';
  $('#fb').innerHTML = fb;
  $('#qNext').focus();
  $('#qNext').addEventListener('click', () => { Q.i++; renderQuestion(); });
  const bar = $('.hunt-bar .score'); if (bar) bar.textContent = Q.score + '/' + Q.list.length;
  if (ok && !REDUCED) confetti($('#qw'));
}

function renderHuntEnd() {
  const area = $('#huntArea');
  const pct = Math.round(Q.score / Q.list.length * 100);
  let h = '<div class="hunt"><div class="q"><div class="qk">Bitti</div><div class="qt" style="font-size:1.7rem">' + Q.score + ' / ' + Q.list.length + ' doğru · %' + pct + '</div>';
  h += '<p class="kisa">' + (pct >= 90 ? 'Çok iyi; kuralları kulağına yerleştirmişsin.' : pct >= 60 ? 'İyi gidiyorsun. Yanlışlarına bir kez daha bak.' : 'Sorun değil; kural kartlarına dönüp aynı türü tekrar dene.') + ' En uzun doğru serin: <b>' + Q.best + '</b>.</p>';
  const types = Object.keys(Q.stats);
  h += '<div class="hbars" style="margin:14px 0">' + types.map((t, i) => '<div class="hbar" style="--lc:var(--c-ince);--i:' + i + '"><span>' + TYPE_NAME[t] + '</span><div class="b"><i style="--p:' + (Q.stats[t].ok / Q.stats[t].n).toFixed(2) + '"></i></div><span class="n">' + Q.stats[t].ok + '/' + Q.stats[t].n + '</span></div>').join('') + '</div>';
  if (Q.wrong.length) h += '<div class="sec-t">Yanlışların</div><div class="hard">' + Q.wrong.map((q) => '<button type="button" data-w="' + esc(q.w.text) + '"><b>' + esc(q.w.text) + '</b><span>' + esc(TYPE_NAME[q.type]) + '</span></button>').join('') + '</div>';
  h += '<div class="acts" style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn pri" type="button" id="huntAgain">Yeni tur</button><button class="btn" type="button" id="huntBack2">Alıştırmaya dön</button></div></div></div>';
  area.innerHTML = h;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#huntArea .hbar .b i').forEach((i) => { i.style.width = (parseFloat(i.style.getPropertyValue('--p')) * 100) + '%'; })));
  $('#huntAgain').addEventListener('click', () => { const o = Q.opts; startHuntWith(o); });
  $('#huntBack2').addEventListener('click', endHunt);
  area.querySelector('.hard') && area.querySelector('.hard').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { endHunt(); const x = $('#drill'); labTryGo(b.dataset.w); } });
  if (pct >= 80 && !REDUCED) confetti($('#huntArea .q'), 36);
}
function startHuntWith(o) {
  $$('#huntMode button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === o.mode ? 'true' : 'false'));
  $$('#huntSrc button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === o.src ? 'true' : 'false'));
  $('#huntArea').hidden = true; $('#pHome').hidden = false;
  startHunt({ letter: o.letter });
}
function labTryGo(word) {
  goView('read');
  if (!App.A) { toast('Önce bir metin çözümle; sözcük laboratuvarı orada.', 2600); return; }
  setTimeout(() => { showPane('word'); $('#labIn').value = word; labTry(word); openSide(); }, 150);
}

/* küçük konfeti: doğru cevapta */
function confetti(host, n) {
  if (!host) return;
  n = n || 14;
  const r = host.getBoundingClientRect();
  const cols = ['--c-vurgu', '--c-acik', '--c-kapali', '--c-n', '--c-ince', '--c-bag', '--c-ozel'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const col = cols[i % cols.length];
    const x = r.left + r.width * (0.2 + Math.random() * 0.6), y = r.top + r.height * 0.5;
    s.style.cssText = 'position:fixed;z-index:120;pointer-events:none;width:8px;height:8px;border-radius:2px;background:var(' + col + ');left:' + x + 'px;top:' + y + 'px';
    document.body.appendChild(s);
    const dx = (Math.random() - 0.5) * 260, dy = -80 - Math.random() * 160;
    s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 1, offset: 0.55 }, { transform: 'translate(' + (dx * 1.15) + 'px,' + (dy + 260) + 'px) rotate(700deg)', opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }
}

/* ================= Hoca modu ================= */
function setHoca(on) {
  App.hoca.on = !!on; saveHoca();
  document.body.classList.toggle('hoca', App.hoca.on);
  $('#swHoca').checked = App.hoca.on;
  const s2 = $('#swHoca2'); if (s2) s2.checked = App.hoca.on;
  toast(App.hoca.on ? 'Hoca modu açık · sözcük panelinden not ekleyebilirsin' : 'Hoca modu kapalı', 2200);
  if (App.A) { reanalyze(); if (App.selW >= 0) selectWord(App.selW, { quiet: true }); }
}
function openHocaDialog() {
  const body = $('#hocaBody'), h = App.hoca;
  const items = [];
  Object.keys(h.stress).forEach((k) => items.push({ k, t: 'vurgu: ' + (h.stress[k] + 1) + '. hece', del: () => { delete h.stress[k]; } }));
  Object.keys(h.eKapali).forEach((k) => items.push({ k, t: 'kapalı e: hece ' + h.eKapali[k].map((x) => x + 1).join(', '), del: () => { delete h.eKapali[k]; } }));
  h.ince.forEach((k) => items.push({ k, t: 'l ince söylenir', del: () => { h.ince = h.ince.filter((x) => x !== k); } }));
  let html = '<p>Hocanın söylediği istisnaları sözcük sözcük kaydet; uygulama bunları “Hocaya göre” etiketiyle gösterir. Notlar yalnız bu tarayıcıda durur.</p>';
  html += '<div class="rrow" style="padding:0 0 8px"><label for="swHoca3">Hoca modu</label><span class="sp"></span><input class="swt" id="swHoca3" type="checkbox"' + (h.on ? ' checked' : '') + '></div>';
  html += '<div class="hoca-list">' + (items.length ? items.map((it, i) => '<div class="it"><b>' + esc(it.k) + '</b><span class="mut">' + esc(it.t) + '</span><button class="btn sm ic ghost" data-del="' + i + '" aria-label="Sil">' + ic('trash') + '</button></div>').join('') : '<p class="mut">Henüz not yok. Hoca modunu açıp bir sözcüğe tıkla; paneldeki “Hoca notu” bölümünden vurguyu ya da kapalı e’yi değiştir.</p>') + '</div>';
  html += '<div class="tools"><button class="btn sm" id="hcExp">' + ic('download') + 'Dışa aktar</button><button class="btn sm" id="hcImp">' + ic('upload') + 'İçe aktar</button><button class="btn sm ghost" id="hcClr">Tümünü sil</button></div>';
  html += '<textarea class="json" id="hcJson" placeholder="İçe aktarmak için JSON’u buraya yapıştır, sonra “İçe aktar”a bas." spellcheck="false"></textarea>';
  body.innerHTML = html;
  const dlg = $('#dlgHoca'); if (!dlg.open) dlg.showModal();
  body.onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { items[+d.dataset.del].del(); saveHoca(); finishHoca(); openHocaDialog(); return; }
    if (e.target.closest('#hcExp')) { const j = JSON.stringify({ stress: h.stress, eKapali: h.eKapali, ince: h.ince }, null, 1); $('#hcJson').value = j; copyText(j, 'Hoca notları kopyalandı'); return; }
    if (e.target.closest('#hcImp')) {
      try { const j = JSON.parse($('#hcJson').value); App.hoca.stress = Object.assign({}, j.stress || {}); App.hoca.eKapali = Object.assign({}, j.eKapali || {}); App.hoca.ince = Array.isArray(j.ince) ? j.ince.slice() : []; saveHoca(); finishHoca(); openHocaDialog(); toast('İçe aktarıldı', 1600); }
      catch (err) { toast('JSON okunamadı', 2200); }
      return;
    }
    if (e.target.closest('#hcClr')) { if (confirm('Tüm Hoca notları silinsin mi?')) { App.hoca.stress = {}; App.hoca.eKapali = {}; App.hoca.ince = []; saveHoca(); finishHoca(); openHocaDialog(); } return; }
  };
  $('#swHoca3').onchange = (e) => setHoca(e.target.checked);
}
function finishHoca() { if (App.A) { reanalyze(); if (App.selW >= 0) selectWord(App.selW, { quiet: true }); } const b = $('#hocaOpen'); if (b) b.textContent = '★ Notlarım (' + hocaCount() + ')'; }
