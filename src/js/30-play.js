/* ==========================================================================
   Karaoke okuma: zaman çizelgesi, oynatıcı, soluk ölçer, hece vuruşu, prompter
   ========================================================================== */
const P = {
  playing: false, t: 0, tl: null, idx: 0, last: 0, raf: 0, range: null, loopLeft: 0, loopSi: -1,
  curSi: -1, curGi: -1, curEv: null, used: 0, hooks: [], sent: [], els: null, audio: null, seekRaf: 0
};

function spsNow() { return (E.TEMPOS[App.tempo] || E.TEMPOS.normal).sps; }

function invalidatePlan() { P.tl = null; P.els = null; }

function plan() {
  if (P.tl) return P.tl;
  const tl = E.buildTimeline(App.A, { sps: spsNow() });
  P.tl = tl;
  P.sent = App.A.sentences.map(() => ({ t0: Infinity, t1: 0 }));
  tl.events.forEach((e) => { const s = P.sent[e.si]; if (!s) return; s.t0 = Math.min(s.t0, e.t0); s.t1 = Math.max(s.t1, e.t1); });
  // paragraf aralarının payı bir önceki cümleye değil sonrakinin başına
  P.sent.forEach((s, i) => { if (!isFinite(s.t0)) s.t0 = i ? P.sent[i - 1].t1 : 0; });
  // her cümle bir öncekinin bittiği yerden başlasın (paragraf durakları dahil)
  for (let i = 1; i < P.sent.length; i++) P.sent[i].t0 = Math.min(P.sent[i].t0, P.sent[i - 1].t1);
  buildTicks();
  return tl;
}

function elsMap() {
  if (P.els) return P.els;
  const m = { w: new Map(), sy: new Map(), sent: [] };
  $$('#stage .w').forEach((w) => { const gi = +w.dataset.gi; m.w.set(gi, w); m.sy.set(gi, $$('.sy', w)); });
  m.sent = $$('#stage .sent');
  P.els = m;
  return m;
}

function buildTicks() {
  const tl = P.tl, total = tl.total || 1;
  let h = '';
  P.sent.forEach((s, i) => { if (i) h += '<i style="left:' + (s.t0 / total * 100).toFixed(2) + '%"></i>'; });
  tl.events.forEach((e) => { if (e.type === 'pause' && e.soluk === true && e.t1 - e.t0 > 700) h += '<i class="p" style="left:' + (e.t0 / total * 100).toFixed(2) + '%"></i>'; });
  $('#ticks').innerHTML = h;
  $('#tmTot').textContent = fmtTime(total);
}

function rangeNow() { return P.range || { t0: 0, t1: plan().total }; }

/* ---- çalma ---- */
function ensureAudio() {
  if (P.audio) return P.audio;
  try { const C = window.AudioContext || window.webkitAudioContext; if (C) P.audio = new C(); } catch (e) { /* yoksay */ }
  return P.audio;
}
function blip(strong) {
  const a = P.audio; if (!a || !App.tick) return;
  try {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = strong ? 1320 : 880;
    const t = a.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(strong ? 0.22 : 0.12, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.09);
  } catch (e) { /* yoksay */ }
}

function play() {
  if (!App.A || !App.A.sentences.length) return;
  plan();
  const r = rangeNow();
  if (P.t >= r.t1 - 20 || P.t < r.t0) { P.t = r.t0; resetCursor(P.t); }
  ensureAudio(); if (P.audio && P.audio.state === 'suspended') P.audio.resume();
  P.playing = true; P.last = performance.now();
  $('#dock').classList.add('playing'); $('#stage').classList.add('playing'); $('#prompter').classList.add('playing');
  syncPlayButtons();
  cancelAnimationFrame(P.raf); P.raf = requestAnimationFrame(frame);
}
function pause() {
  P.playing = false; cancelAnimationFrame(P.raf);
  $('#dock').classList.remove('playing'); $('#prompter').classList.remove('playing');
  syncPlayButtons();
}
function stopPlayback() {
  pause(); P.t = 0; P.range = null; P.loopLeft = 0; clearCursor(); $('#stage').classList.remove('playing');
  updateProgress();
}
function togglePlay() { if (P.playing) pause(); else play(); }
function syncPlayButtons() { $('#pPlay').classList.toggle('playing', P.playing); }

function frame(now) {
  if (!P.playing) return;
  const dt = Math.min(80, now - P.last); P.last = now;
  P.t += dt;
  const r = rangeNow();
  // cümle tekrarı (düğme)
  if (App.loop && P.loopSi >= 0 && P.sent[P.loopSi] && P.t >= P.sent[P.loopSi].t1) { P.t = P.sent[P.loopSi].t0; resetCursor(P.t); }
  if (P.t >= r.t1) {
    if (P.loopLeft > 0) { P.loopLeft--; P.t = r.t0; resetCursor(P.t); toast('Tekrar: ' + (P.loopLeft + 1) + ' kaldı', 900); }
    else { P.t = r.t1; advance(P.t); finishPlayback(); return; }
  }
  advance(P.t);
  updateProgress();
  P.raf = requestAnimationFrame(frame);
}
function finishPlayback() {
  pause(); updateProgress();
  const st = $('#stage'); st.classList.remove('playing');
  clearCursor(true);
  P.range = null;
}

/* ---- imleç ---- */
function clearCursor(keepDone) {
  const m = elsMap();
  if (P.curEv) deact(P.curEv);
  $$('#stage .w.now, #stage .w.pzn').forEach((x) => x.classList.remove('now', 'pzn'));
  if (!keepDone) $$('#stage .w.done').forEach((x) => x.classList.remove('done'));
  $$('#stage .sent.act').forEach((x) => x.classList.remove('act'));
  P.curEv = null; P.idx = 0; P.curGi = -1; P.curSi = -1;
}
function deact(ev) {
  const m = elsMap();
  if (ev.type === 'syl') {
    const sy = (m.sy.get(ev.wi) || [])[ev.k]; if (sy) sy.classList.remove('now');
    $$('#pwrap .sy.now').forEach((x) => x.classList.remove('now'));
  } else {
    const w = m.w.get(ev.wi); if (w) w.classList.remove('pzn');
  }
}
/** t anına atla: tüm durumu yeniden kur */
function resetCursor(t) {
  const tl = plan(), m = elsMap();
  clearCursor();
  const ev = tl.events;
  // ikili arama
  let lo = 0, hi = ev.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ev[mid].t0 <= t) lo = mid + 1; else hi = mid; }
  P.idx = lo;
  // okunmuş sözcükler
  let lastGi = -1;
  for (let i = 0; i < lo; i++) { if (ev[i].type === 'syl') lastGi = ev[i].wi; }
  if (lastGi >= 0) m.w.forEach((el, gi) => { if (gi < lastGi) el.classList.add('done'); });
  // soluk
  P.used = 0;
  const cap = App.cap;
  for (let i = 0; i < lo; i++) {
    const e = ev[i];
    if (e.type === 'syl') P.used++;
    else if (e.soluk === true) P.used = 0;
    else if (e.soluk === 'mumkun') P.used = Math.max(0, P.used - cap * 0.35);
  }
  setBreath(false);
  // son olay etkin mi?
  const cur = lo > 0 ? ev[lo - 1] : null;
  if (cur && t < cur.t1) fire(cur, true);
  else if (cur) { const si = cur.si; if (si !== P.curSi) sentChange(si, true); }
  updateProgress();
}

function advance(t) {
  const tl = P.tl, ev = tl.events;
  if (P.curEv && t >= P.curEv.t1) { deact(P.curEv); P.curEv = null; }
  while (P.idx < ev.length && ev[P.idx].t0 <= t) {
    const e = ev[P.idx++];
    if (t >= e.t1) { // atlanan kısa olay
      if (e.type === 'syl') P.used++;
      continue;
    }
    if (P.curEv) deact(P.curEv);
    fire(e, false);
  }
}

function sentChange(si, instant) {
  const m = elsMap();
  $$('#stage .sent.act').forEach((x) => x.classList.remove('act'));
  const el = m.sent[si];
  if (el) {
    el.classList.add('act');
    const r = el.getBoundingClientRect();
    if (P.playing && (r.top < 90 || r.bottom > window.innerHeight - 120)) vScroll(el, { block: 'center', behavior: instant || REDUCED ? 'auto' : 'smooth' });
  }
  P.curSi = si;
  $('#tmSent').textContent = (si + 1) + ' / ' + App.A.sentences.length;
  if ($('#pane-sent').classList.contains('on') && $('#side').offsetParent !== null && App.selS !== si) { App.selS = si; markSentSel(si); renderSentPane(App.A.sentences[si]); }
  P.hooks.forEach((h) => h('sent', si));
}

function fire(e, silent) {
  const m = elsMap();
  P.curEv = e;
  if (e.si !== P.curSi) sentChange(e.si, silent);
  if (e.type === 'syl') {
    const wEl = m.w.get(e.wi);
    if (P.curGi !== e.wi) {
      const prev = m.w.get(P.curGi);
      if (prev) { prev.classList.remove('now'); prev.classList.add('done'); }
      if (wEl) wEl.classList.add('now');
      P.curGi = e.wi;
    }
    const sy = (m.sy.get(e.wi) || [])[e.k]; if (sy) sy.classList.add('now');
    if (!silent) {
      P.used++; setBreath(false);
      blip(e.w.stress.syl === e.k);
      toneCursor(e.wi, e.k);
    }
  } else {
    const wEl = m.w.get(e.wi);
    if (wEl) { wEl.style.setProperty('--pzd', Math.max(80, e.t1 - e.t0) + 'ms'); wEl.classList.remove('pzn'); void wEl.offsetWidth; wEl.classList.add('pzn'); }
    if (!silent) {
      if (e.soluk === true) { P.used = 0; setBreath(true); }
      else if (e.soluk === 'mumkun') { P.used = Math.max(0, P.used - App.cap * 0.35); setBreath(true); }
    }
  }
  P.hooks.forEach((h) => h(e.type, e, silent));
}

function setBreath(refill) {
  const b = $('#breath'), f = $('#breathFill');
  const left = clamp(1 - P.used / App.cap, 0, 1);
  b.classList.toggle('in', !!refill);
  b.classList.toggle('low', left < 0.22);
  f.style.transform = 'scaleX(' + left.toFixed(3) + ')';
}

function toneCursor(gi, k) {
  const d = $('#sentBody .tone .dot[data-g="' + gi + ':' + k + '"]');
  if (!d) return;
  $$('#sentBody .tone .cur.on').forEach((c) => c.classList.remove('on'));
  $$('#sentBody .tone .dot.now').forEach((q) => q.classList.remove('now'));
  const cur = d.closest('svg').querySelector('.cur'), x = d.getAttribute('cx');
  if (cur) { cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.classList.add('on'); }
  d.classList.add('now');
}

/* ---- ilerleme çubuğu ---- */
function updateProgress() {
  if (!P.tl) return;
  const r = rangeNow(), total = (r.t1 - r.t0) || 1;
  const f = clamp((P.t - r.t0) / total, 0, 1);
  $('#pfill').style.width = (f * 100) + '%';
  $('#pknob').style.left = (f * 100) + '%';
  $('#tmNow').textContent = fmtTime(P.t - r.t0);
  $('#tmTot').textContent = fmtTime(total);
  $('#track').setAttribute('aria-valuenow', Math.round(f * 100));
}

function seekFrac(f) {
  plan();
  const r = rangeNow();
  P.t = r.t0 + clamp(f, 0, 1) * (r.t1 - r.t0);
  cancelAnimationFrame(P.seekRaf);
  P.seekRaf = requestAnimationFrame(() => { resetCursor(P.t); if (P.playing) P.last = performance.now(); $('#stage').classList.add('playing'); });
  updateProgress();
}

function currentSent() { return P.curSi >= 0 ? P.curSi : (App.selS >= 0 ? App.selS : 0); }

function playSentence(si, loops) {
  plan();
  const s = P.sent[si]; if (!s) return;
  P.range = { t0: s.t0, t1: s.t1, si };
  P.loopLeft = loops ? loops - 1 : 0;
  P.t = s.t0; resetCursor(P.t);
  P.loopSi = -1;
  play();
}
function playFromWord(gi) {
  plan();
  const e = P.tl.events.find((x) => x.type === 'syl' && x.wi === gi);
  if (!e) return;
  P.range = null; P.loopLeft = 0;
  P.t = e.t0; resetCursor(P.t);
  if (App.loop) P.loopSi = e.si;
  play();
}
function stepSentence(d) {
  plan();
  const n = App.A.sentences.length;
  const si = clamp(currentSent() + d, 0, n - 1);
  if (P.range) { const s = P.sent[si]; P.range = { t0: s.t0, t1: s.t1, si }; P.t = s.t0; }
  else P.t = P.sent[si].t0;
  resetCursor(P.t);
  if (App.loop) P.loopSi = si;
  if (P.playing) P.last = performance.now();
  selectSentence(si, { quiet: true });
  const el = elsMap().sent[si]; if (el && !P.playing) vScroll(el, { block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  $('#stage').classList.add('playing');
  updateProgress();
}

function setTempo(id) {
  if (!E.TEMPOS[id]) id = 'normal';
  const frac = P.tl && P.tl.total ? P.t / P.tl.total : 0;
  const si = P.range ? P.range.si : -1;
  App.tempo = id; store.set('tempo', id);
  $$('#tempo button, #pTempo button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === id ? 'true' : 'false'));
  if (!P.tl) return;
  invalidatePlan(); plan();
  if (si >= 0 && P.sent[si]) { P.range = { t0: P.sent[si].t0, t1: P.sent[si].t1, si }; P.t = P.range.t0 + (P.t - P.range.t0) * 0; }
  else P.t = frac * P.tl.total;
  resetCursor(P.t);
  updateProgress();
}

function bindDock() {
  $('#btnPlay').addEventListener('click', togglePlay);
  $('#pPlay').addEventListener('click', togglePlay);
  $('#btnPrev').addEventListener('click', () => stepSentence(-1));
  $('#btnNext').addEventListener('click', () => stepSentence(1));
  $$('#tempo button, #pTempo button').forEach((b) => b.addEventListener('click', () => setTempo(b.dataset.t)));
  $('#btnLoop').addEventListener('click', () => {
    App.loop = !App.loop; $('#btnLoop').setAttribute('aria-pressed', App.loop);
    P.loopSi = App.loop ? currentSent() : -1;
    toast(App.loop ? (currentSent() + 1) + '. cümle tekrarlanacak' : 'Tekrar kapalı', 1400);
  });
  $('#btnTick').addEventListener('click', () => {
    App.tick = !App.tick; $('#btnTick').setAttribute('aria-pressed', App.tick);
    if (App.tick) { ensureAudio(); if (P.audio && P.audio.state === 'suspended') P.audio.resume(); blip(true); }
    toast(App.tick ? 'Hece vuruşu açık' : 'Hece vuruşu kapalı', 1200);
  });
  const track = $('#track');
  let drag = false;
  const at = (e) => { const r = track.getBoundingClientRect(); seekFrac((e.clientX - r.left) / r.width); };
  track.addEventListener('pointerdown', (e) => { drag = true; track.setPointerCapture(e.pointerId); at(e); });
  track.addEventListener('pointermove', (e) => { if (drag) at(e); });
  track.addEventListener('pointerup', () => { drag = false; });
  track.addEventListener('pointercancel', () => { drag = false; });
  track.addEventListener('keydown', (e) => {
    const r = rangeNow(), f = (P.t - r.t0) / ((r.t1 - r.t0) || 1);
    if (e.key === 'ArrowRight') { seekFrac(f + 0.03); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft') { seekFrac(f - 0.03); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'Home') { seekFrac(0); e.preventDefault(); }
    else if (e.key === 'End') { seekFrac(1); e.preventDefault(); }
  });
}

/* ---- Prompter ---- */
const PR = { open: false, si: -1 };
function openPrompter() {
  if (!App.A) return;
  plan();
  PR.open = true;
  const pr = $('#prompter');
  pr.classList.add('on'); pr.classList.toggle('playing', P.playing);
  document.documentElement.style.overflow = 'hidden';
  renderPrompter(currentSent());
  if (P.hooks.indexOf(prompterHook) < 0) P.hooks.push(prompterHook);
  $('#pPlay').focus();
}
function closePrompter() {
  PR.open = false; $('#prompter').classList.remove('on'); document.documentElement.style.overflow = '';
  P.hooks = P.hooks.filter((h) => h !== prompterHook);
}
function renderPrompter(si) {
  const A = App.A; PR.si = si;
  const S = A.sentences[si]; if (!S) return;
  const row = (s, cls) => s ? '<div class="' + cls + '">' + sentenceText(s) + '</div>' : '';
  $('#pwrap').innerHTML = row(A.sentences[si - 1], 'pprev') + '<div class="pline stage" data-on="vurgu durak bag" lang="tr">' + lineHTML(S) + '</div>' + row(A.sentences[si + 1], 'pnext');
  $('#pwrap .pline').classList.toggle('playing', P.playing);
}
function prompterHook(type, e) {
  if (!PR.open) return;
  if (type === 'sent') { renderPrompter(e); return; }
  const wrap = $('#pwrap .pline'); if (!wrap) return;
  if (type === 'syl') {
    $$('.w.now', wrap).forEach((x) => { x.classList.remove('now'); x.classList.add('done'); });
    const w = $('.w[data-gi="' + e.wi + '"]', wrap);
    if (w) { w.classList.add('now'); const sy = $$('.sy', w)[e.k]; $$('.sy.now', wrap).forEach((x) => x.classList.remove('now')); if (sy) sy.classList.add('now'); }
  }
}
function bindPrompter() {
  $('#btnPrompt').addEventListener('click', openPrompter);
  $('#pClose').addEventListener('click', closePrompter);
  $('#pSize').addEventListener('input', (e) => { $('#prompter').style.setProperty('--ps', e.target.value + 'px'); });
  $('#pMirror').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); $('#pwrap').style.transform = on ? 'scaleX(-1)' : ''; });
}
