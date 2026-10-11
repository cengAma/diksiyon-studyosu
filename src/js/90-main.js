/* ==========================================================================
   Açılış, gezinme, canlı örnek, kısayollar
   ========================================================================== */
function applyKinds() {
  Object.keys(App.kinds).forEach((si) => { const S = App.A.sentences[+si]; if (S) S.kind = App.kinds[si]; });
}

function readingTime(A) { return E.buildTimeline(A, { sps: E.TEMPOS.normal.sps }).total; }

function updateTextbar() {
  const A = App.A; if (!A) return;
  const raw = (App.title || App.text).replace(/\s+/g, ' ');
  $('#tbText').textContent = App.title ? App.title : (raw.length > 110 ? raw.slice(0, 108) + '…' : raw);
  const st = A.stats;
  $('#tbStat').innerHTML = '<b>' + st.sentences + '</b> cümle · <b>' + st.words + '</b> sözcük · <b>' + st.syl + '</b> hece · ≈ <b>' + fmtTime(readingTime(A)) + '</b>';
}

function reanalyze() {
  if (!App.text) return;
  const wasPlaying = P.playing; if (wasPlaying) pause();
  const y = window.scrollY;
  App.A = E.analyze(App.text, engineOpts());
  applyKinds();
  invalidatePlan();
  renderStage();
  window.scrollTo(0, y);
  if (App.selW >= 0 && !App.A.words[App.selW]) App.selW = -1;
  if (App.selS >= 0 && !App.A.sentences[App.selS]) App.selS = -1;
  if (App.selS >= 0) renderSentPane(App.A.sentences[App.selS]);
  if (App.view === 'report') renderReport();
}

function showStudio(first) {
  const hero = $('#hero'), studio = $('#studio');
  hero.style.opacity = '0'; hero.style.transform = 'translateY(-18px)';
  setTimeout(() => { hero.hidden = true; }, first ? 360 : 0);
  studio.hidden = false;
  $('#dock').classList.add('on');
  liveStop();
}
function showHero() {
  stopPlayback();
  const hero = $('#hero');
  hero.hidden = false; $('#studio').hidden = true; $('#dock').classList.remove('on');
  requestAnimationFrame(() => { hero.style.opacity = '1'; hero.style.transform = ''; });
  $('#inp').value = App.text || $('#inp').value;
  updateCount();
  window.scrollTo(0, 0);
  $('#inp').focus();
  liveAuto();
}

/* basit yabancı dil sezgisi: İngilizce'ye özgü sık sözcükler ya da w/q/x harfleri */
function looksForeign(text) {
  const ws = text.toLocaleLowerCase('tr').match(/[a-zçğıöşüâîû]+/g) || [];
  if (ws.length < 4) return false;
  const EN = new Set(['the', 'and', 'of', 'to', 'is', 'are', 'you', 'that', 'with', 'for', 'this', 'was', 'have', 'not', 'from', 'but', 'they', 'what', 'quick', 'brown', 'over', 'hello', 'world']);
  let hit = 0;
  for (const w of ws) if (EN.has(w) || /[wqx]/.test(w)) hit++;
  return hit / ws.length >= 0.25;
}
function analyzeAndShow(text, o) {
  o = o || {};
  text = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!text) { toast('Önce bir metin yaz ya da bir örnek seç.', 2200); return; }
  stopPlayback(); invalidatePlan();
  const A = E.analyze(text, engineOpts());
  if (!A.sentences.length) { toast('Metinde okunacak bir sözcük bulamadım.', 2600); return; }
  App.text = text; App.A = A; App.kinds = {}; App.selW = -1; App.selS = -1; App.title = o.title || '';
  store.set('text', text.slice(0, 20000));
  $('#inp').value = text;
  goView('read');
  const target = Array.from(App.on);
  showStudio(true);
  App.on = new Set(); applyLayers();
  renderStage({ enter: true });
  buildLabEmpty();
  plan(); updateProgress(); $('#tmSent').textContent = '1 / ' + App.A.sentences.length;
  selectSentence(0, { quiet: true });
  showPane('sent');
  closeSide();
  window.scrollTo(0, 0);
  setTimeout(() => scanLayers(target), 120);
  if (looksForeign(text)) setTimeout(() => toast('Bu metin Türkçe gibi görünmüyor; kurallar yine de Türkçe okunuşa göre uygulandı.', 4200), 900);
  if (o.hash !== false) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* yoksay */ } }
}
function buildLabEmpty() { labShow(null); }

/* ---- görünümler ---- */
function goView(v) {
  if (App.view === 'read' && v !== 'read' && P.playing) pause();
  App.view = v;
  $$('.view').forEach((x) => x.classList.toggle('on', x.id === 'view-' + v));
  $$('#tabs [data-view]').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
  positionPill();
  $('#dock').classList.toggle('on', v === 'read' && !$('#studio').hidden);
  if (v === 'report') renderReport();
  if (v === 'practice') { const b = $('#hocaOpen'); if (b) b.textContent = '★ Notlarım (' + hocaCount() + ')'; const s2 = $('#swHoca2'); if (s2) s2.checked = App.hoca.on; }
  if (v !== 'read') window.scrollTo(0, 0);
}
function positionPill() {
  const sel = $('#tabs [aria-selected="true"]'), pill = $('#tabs .pill');
  if (!sel || !pill) return;
  pill.style.width = sel.offsetWidth + 'px';
  pill.style.transform = 'translateX(' + sel.offsetLeft + 'px)';
}

/* ---- tema ---- */
function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function setTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const eff = effectiveTheme();
  $('#btnTheme').innerHTML = ic(eff === 'dark' ? 'sun' : 'moon');
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = eff === 'dark' ? '#071619' : '#edf4f6';
  store.set('theme', t || 'auto');
}

/* ================= Canlı kelime kartı ================= */
const Live = { loop: 0, token: 0, i: 0 };
const DEMO = ['sonbahar', 'kalp', 'değil', 'geliyor', 'kâğıt', 'yalnız', 'kendi', 'dünyanın'];
function liveStop() { Live.loop++; Live.token++; }

async function liveShow(text, src, auto) {
  const my = ++Live.token;
  const w = E.buildWord(text);
  if (!w.letters.length) return;
  const el = $('#liveWord'), why = $('#liveWhy');
  el.dataset.on = '';
  el.innerHTML = wordHTML(w, { lab: true });
  $('#liveSrc').textContent = src;
  $('#liveSound').innerHTML = '<span class="ipa" title="Okunuşu">' + esc(w.say) + '</span><span>' + w.syl.length + ' hece</span>' + (w.stress.syl >= 0 ? '<span>vurgu: ' + (w.stress.syl + 1) + '. hece</span>' : '');
  const cand = w.marks.filter((m) => m.code !== 'ULAMA_ALAN' && !(m.code.indexOf('SON_') === 0 && m.sev === 'info') && m.code !== 'VURGU_TEK').sort((a, b) => {
    const pa = Math.min.apply(null, a.at.length ? a.at : [99]), pb = Math.min.apply(null, b.at.length ? b.at : [99]);
    return (a.layer === 'vurgu' ? 100 : pa) - (b.layer === 'vurgu' ? 100 : pb);
  });
  const steps = cand.slice(0, 5);
  if (!steps.length) { why.innerHTML = '<div class="t">Sade bir sözcük</div><p>Özel bir kural yok; yine de hece ve vurguya bak.</p>'; el.dataset.on = 'vurgu heceler'; return; }
  const gap = auto ? 1750 : 520;
  const seen = new Set();
  for (const m of steps) {
    if (my !== Live.token) return;
    seen.add(m.layer);
    el.dataset.on = Array.from(seen).join(' ');
    const col = markColor(m);
    why.classList.remove('sw'); void why.offsetWidth; why.classList.add('sw');
    why.innerHTML = '<div class="t"><i style="background:var(' + col + ')"></i>' + esc(m.title) + ' <span class="cf ' + m.conf + '">' + CONF[m.conf] + '</span></div><p>' + esc(m.text) + '</p>';
    $$('.l.on', el).forEach((x) => x.classList.remove('on'));
    m.at.forEach((i) => { const l = $('.l[data-i="' + i + '"]', el); if (l) l.classList.add('on'); });
    await sleep(REDUCED ? 600 : gap);
  }
  if (my !== Live.token) return;
  $$('.l.on', el).forEach((x) => x.classList.remove('on'));
}

async function liveAuto() {
  const my = ++Live.loop;
  while (my === Live.loop) {
    if (document.hidden || $('#hero').hidden || App.view !== 'read') { await sleep(700); continue; }
    await liveShow(DEMO[Live.i++ % DEMO.length], 'örnek sözcük', true);
    if (my !== Live.loop) return;
    await sleep(1300);
  }
}

/* ---- giriş alanı ---- */
function updateCount() {
  const v = $('#inp').value.trim();
  const n = v ? v.split(/\s+/).length : 0;
  $('#cnt').textContent = n + ' sözcük';
}
function lastToken(v) {
  const m = v.match(/[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]+(?=[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]*$)/);
  return m ? m[0].replace(/^['’]+|['’]+$/g, '') : '';
}

function buildSamples() {
  const keys = Object.keys(BANK.texts || {});
  const items = [];
  if (keys[0]) items.push(['Haber metni', BANK.texts[keys[0]], 'Haber metni']);
  if (keys[1]) items.push(['Anlatı metni', BANK.texts[keys[1]], 'Anlatı metni']);
  items.push(['Sonbahar cümlesi', 'Sonbaharda renkli yaprakları sanki kimse toplamıyor. Nehir kenarında nine, nane ve nar topladı.', 'Sonbahar cümleleri']);
  if ((BANK.twisters || []).length) items.push(['Tekerlemeler', BANK.twisters.slice(0, 3).join('\n\n'), 'Tekerlemeler']);
  if ((BANK.workSentences || []).length) items.push(['İş yeri cümleleri', BANK.workSentences.slice(0, 8).join('\n'), 'İş yeri cümleleri']);
  items.push(['Sayı ve tarih', SAMPLE_NUM, 'Sayı, tarih ve kısaltma']);
  $('#samples').innerHTML = items.map((x, i) => '<button class="chip" type="button" data-s="' + i + '">' + esc(x[0]) + '</button>').join('');
  $('#samples').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const it = items[+b.dataset.s];
    $('#inp').value = it[1]; updateCount();
    analyzeAndShow(it[1], { title: it[2] });
  });
}

function bindHero() {
  const inp = $('#inp');
  let t = 0;
  inp.addEventListener('input', () => {
    updateCount();
    clearTimeout(t);
    t = setTimeout(() => {
      const tok = lastToken(inp.value);
      if (tok && tok.length >= 2) { Live.loop++; liveShow(tok, 'yazdığın son sözcük', false); }
      else if (!inp.value.trim()) liveAuto();
    }, 260);
  });
  inp.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); analyzeAndShow(inp.value); } });
  $('#btnGo').addEventListener('click', () => analyzeAndShow(inp.value));
  $('#btnClear').addEventListener('click', () => { inp.value = ''; updateCount(); inp.focus(); liveAuto(); });
  $('#btnEdit').addEventListener('click', showHero);
  $('#btnShare').addEventListener('click', shareLink);
  $('#btnPrint').addEventListener('click', () => { $$('#legend span').length; window.print(); });
  $('#logo').addEventListener('click', (e) => { e.preventDefault(); goView('read'); if (!$('#studio').hidden) showHero(); else window.scrollTo(0, 0); });
}

/* ================= Yardım ================= */
function buildHelp() {
  const sw = (c) => '<span style="display:inline-block;width:11px;height:11px;border-radius:4px;background:var(' + c + ');margin-right:7px;vertical-align:-1px"></span>';
  $('#helpBody').innerHTML =
    '<p>Metni yapıştır, <b>Çözümle</b>’ye bas. Her sözcük hecelerine ve harflerine ayrılır; kurallar metnin üstünde katman katman açılır. Bir sözcüğe ya da harfe dokununca sağdaki panel o sözcüğün bütün kurallarını, nasıl söylenmesi gerektiğini ve kılavuzdaki yerini gösterir.</p>' +
    '<h4>Katmanlar</h4><ul>' + LAYERS.map((l) => '<li>' + sw(l.col) + '<b>' + esc(l.name) + '</b> — ' + esc(l.sub) + '</li>').join('') + '</ul>' +
    '<h4>Güven düzeyi</h4><ul><li><span class="cf kesin">Kesin kural</span> Türkçe sesbilgisinin değişmez kuralı (örn. kalın/ince ünlü uyumu).</li><li><span class="cf egilim">Genel eğilim</span> Açık/kapalı e, damak n’si, ğ’nin uzatması, vurgu istisnaları gibi hocadan hocaya değişebilen söyleyişler.</li><li><span class="cf hoca">Hocaya göre</span> Hoca modunda sen kaydettin; uygulama senin hocanın söyleyişini esas alır.</li></ul>' +
    '<h4>Kısayollar</h4><div class="keys"><span><span class="kbd">Boşluk</span></span><span>Oynat / duraklat</span><span><span class="kbd">[</span> <span class="kbd">]</span></span><span>Önceki / sonraki cümle</span><span><span class="kbd">1</span>–<span class="kbd">9</span> <span class="kbd">0</span></span><span>Katmanları aç / kapat</span><span><span class="kbd">L</span></span><span>Cümleyi tekrarla</span><span><span class="kbd">M</span></span><span>Hece vuruşu</span><span><span class="kbd">P</span></span><span>Prompter</span><span><span class="kbd">E</span></span><span>Metni düzenle</span><span><span class="kbd">T</span></span><span>Tema</span><span><span class="kbd">← →</span></span><span>(metin odaktayken) sözcükler arasında gez</span><span><span class="kbd">Ctrl ↵</span></span><span>Çözümle</span></div>' +
    '<h4>Gizlilik ve sınırlar</h4><p>Metin ve kayıtlar bu sayfadan dışarı çıkmaz; her şey tarayıcında çalışır. Uygulama sesi okumaz: kuralları ve zamanlamayı gösterir. Kurallar “Türkçe Diksiyon Kılavuzu”ndan alınmıştır; alıntı sözcüklerdeki l/k/g ince söyleyişi küçük bir sözlükle sınırlıdır, istisnaları Hoca modunda ekleyebilirsin.</p>';
}

/* ================= Klavye ================= */
function bindKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const tg = e.target, tag = (tg.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || tg.isContentEditable;
    if (e.key === 'Escape') {
      if (PR.open) { closePrompter(); return; }
      if ($('#side').classList.contains('open')) { closeSide(); return; }
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    const studio = !$('#studio').hidden && App.view === 'read';
    if (k === '?' || (e.key === '/' && e.shiftKey)) { $('#dlgHelp').showModal(); e.preventDefault(); return; }
    if (k === 't') { setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'); return; }
    if (!App.A) return;
    if (k === ' ' && (PR.open || studio) && (tag === 'body' || tg === $('#stage') || tg.closest && tg.closest('#stage'))) { e.preventDefault(); togglePlay(); return; }
    if (!studio && !PR.open) return;
    if (k === '[') stepSentence(-1);
    else if (k === ']') stepSentence(1);
    else if (k === 'l') $('#btnLoop').click();
    else if (k === 'm') $('#btnTick').click();
    else if (k === 'p') { PR.open ? closePrompter() : openPrompter(); }
    else if (k === 'e') { e.preventDefault(); showHero(); }
    else if (/^[0-9]$/.test(k)) { const idx = (+k + 9) % 10; if (LAYERS[idx]) toggleLayer(LAYERS[idx].id); }
  });
}

/* ================= Başlangıç ================= */
function initDialogs() {
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { $$('audio', d).forEach((a) => a.pause()); });
  });
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $('#btnHelp').addEventListener('click', () => $('#dlgHelp').showModal());
  $('#btnHocaMgr').addEventListener('click', openHocaDialog);
  $('#swHoca').addEventListener('change', (e) => setHoca(e.target.checked));
}

function loadFromHash() {
  const m = location.hash.match(/^#t=(.+)$/);
  if (!m) return false;
  try { const txt = decodeURIComponent(escape(atob(m[1]))); if (txt.trim()) { $('#inp').value = txt; updateCount(); analyzeAndShow(txt, { hash: false, title: 'Paylaşılan metin' }); return true; } } catch (e) { /* bozuk bağlantı */ }
  return false;
}

function init() {
  hydrateIcons(document);
  setTheme(store.get('theme', 'auto') === 'auto' ? null : store.get('theme', 'auto'));
  if (store.get('rs', null) != null) setFont(App.rs);
  document.body.classList.toggle('hoca', App.hoca.on);
  $('#swHoca').checked = App.hoca.on;
  $('#capR').value = App.cap; $('#capV').textContent = App.cap;
  $$('#tempo button, #pTempo button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === App.tempo ? 'true' : 'false'));
  buildRail(); buildPanes(); applyLayers();
  bindStage(); bindRail(); bindSentPane(); bindDock(); bindPrompter(); bindRecord(); bindHero(); bindKeys(); initDialogs();
  buildSamples(); buildHelp(); renderPractice(); buildLabEmpty(); renderSentPane(null);
  $$('#tabs [data-view]').forEach((b) => b.addEventListener('click', () => goView(b.dataset.view)));
  window.addEventListener('resize', positionPill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionPill);
  positionPill();
  const prev = store.get('text', '');
  if (prev) { $('#inp').value = prev; updateCount(); }
  if (!loadFromHash()) liveAuto();
  window.DK = { App, E, analyzeAndShow, goView, setLayers, selectWord, selectSentence, playSentence, P, plan }; // hata ayıklama / test
}
init();
