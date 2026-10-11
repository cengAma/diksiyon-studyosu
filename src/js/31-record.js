/* ==========================================================================
   Kayıt: kendi sesini kaydet, dalga biçimi + duraklar + (deneysel) perde çizgisi
   Ses cihazdan çıkmaz; tarayıcıda çözümlenir.
   ========================================================================== */
const REC = { active: false, mr: null, chunks: [], stream: null, url: '', t0: 0, stopTimer: 0, startedPlay: false, range: null };

async function recToggle() {
  if (REC.active) { recStop(); return; }
  if (!App.A) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { toast('Bu tarayıcı kayıt desteklemiyor (Chrome ya da Edge dene).', 3200); return; }
  try {
    REC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) { toast('Mikrofon izni verilmedi.', 2800); return; }
  REC.chunks = [];
  try { REC.mr = new MediaRecorder(REC.stream); } catch (e) { toast('Kayıt başlatılamadı.', 2400); recRelease(); return; }
  REC.mr.ondataavailable = (e) => { if (e.data && e.data.size) REC.chunks.push(e.data); };
  REC.mr.onstop = recFinish;
  REC.mr.start(250);
  REC.active = true; REC.t0 = performance.now();
  $('#btnRec').classList.add('rec-on'); $('#btnRec').setAttribute('aria-label', 'Kaydı durdur');
  // aralığı kaydet: seçili cümle ya da tüm metin
  plan();
  if (!P.playing) {
    P.range = P.range || (App.selS >= 0 ? { t0: P.sent[App.selS].t0, t1: P.sent[App.selS].t1, si: App.selS } : null);
    P.t = rangeNow().t0; resetCursor(P.t);
    REC.startedPlay = true;
    setTimeout(play, 700);
    toast('Kayıt başladı · ekrandaki ilerleyişi izleyerek oku', 2600);
  } else toast('Kayıt başladı', 1600);
  REC.range = { t0: rangeNow().t0, t1: rangeNow().t1 };
  P.hooks.push(recWatch);
}
function recWatch(type) {
  // oynatma bittiğinde (aralığın sonu) 1.6 sn sonra kaydı durdur
  if (!REC.active || !REC.startedPlay) return;
  const r = rangeNow(), tl = P.tl;
  const last = tl.events.filter((e) => e.t0 >= r.t0 && e.t1 <= r.t1 + 1).pop();
  if (last && type === 'syl' && P.curEv === last) { clearTimeout(REC.stopTimer); REC.stopTimer = setTimeout(() => { if (REC.active) recStop(); }, last.t1 - last.t0 + 1800); }
}
function recStop() {
  clearTimeout(REC.stopTimer);
  if (REC.mr && REC.mr.state !== 'inactive') REC.mr.stop();
  REC.active = false;
  P.hooks = P.hooks.filter((h) => h !== recWatch);
  $('#btnRec').classList.remove('rec-on'); $('#btnRec').setAttribute('aria-label', 'Kendi sesimi kaydet');
  if (REC.startedPlay) { pause(); REC.startedPlay = false; }
}
function recRelease() { if (REC.stream) { REC.stream.getTracks().forEach((t) => t.stop()); REC.stream = null; } }

async function recFinish() {
  recRelease();
  const blob = new Blob(REC.chunks, { type: (REC.mr && REC.mr.mimeType) || 'audio/webm' });
  if (REC.url) URL.revokeObjectURL(REC.url);
  REC.url = URL.createObjectURL(blob);
  const dlg = $('#dlgRec'), body = $('#recBody');
  body.innerHTML = '<p>Kayıt çözümleniyor…</p>';
  if (!dlg.open) dlg.showModal();
  let res = null;
  try {
    const buf = await blob.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const audio = await ctx.decodeAudioData(buf.slice(0));
    ctx.close && ctx.close();
    res = analyzeRecording(audio);
  } catch (e) { res = null; }
  renderRecBody(res);
}

function analyzeRecording(audio) {
  const sr = audio.sampleRate, ch = audio.getChannelData(0);
  const hop = Math.round(sr * 0.02);
  const n = Math.floor(ch.length / hop);
  const rms = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = ch[i * hop + j]; s += v * v; } rms[i] = Math.sqrt(s / hop); }
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(n * 0.95)] || 0.05, p20 = sorted[Math.floor(n * 0.2)] || 0;
  const thr = Math.max(0.008, p20 * 2.4, p95 * 0.09);
  const voiced = Array.from(rms, (v) => v > thr);
  // sessizlik aralıkları
  const segs = []; let i = 0;
  while (i < n) {
    if (!voiced[i]) { let j = i; while (j < n && !voiced[j]) j++; segs.push({ a: i, b: j }); i = j; } else i++;
  }
  const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
  const inner = segs.filter((s) => s.a > first && s.b <= last + 1 && (s.b - s.a) * 0.02 >= 0.28);
  const speech = first < 0 ? 0 : (last - first + 1) * 0.02;
  // perde (deneysel): 8 kHz'e indir, öz-ilinti
  const dec = Math.max(1, Math.round(sr / 8000)), sr2 = sr / dec;
  const x = new Float32Array(Math.floor(ch.length / dec));
  for (let k = 0; k < x.length; k++) { let s = 0; for (let j = 0; j < dec; j++) s += ch[k * dec + j]; x[k] = s / dec; }
  const win = Math.round(sr2 * 0.04), minLag = Math.round(sr2 / 400), maxLag = Math.round(sr2 / 75);
  const pitch = new Float32Array(n).fill(0);
  for (let f = 0; f < n; f++) {
    if (!voiced[f]) continue;
    const start = Math.round(f * 0.02 * sr2);
    if (start + win + maxLag >= x.length) break;
    let e0 = 0; for (let k = 0; k < win; k++) e0 += x[start + k] * x[start + k];
    if (e0 < 1e-6) continue;
    let best = 0, bl = 0;
    for (let lag = minLag; lag <= maxLag; lag++) { let s = 0; for (let k = 0; k < win; k++) s += x[start + k] * x[start + k + lag]; if (s > best) { best = s; bl = lag; } }
    if (bl && best / e0 > 0.45) pitch[f] = sr2 / bl;
  }
  return { dur: audio.duration, rms, voiced, n, speech, inner, first, last, pitch, p95, thr };
}

function renderRecBody(res) {
  const body = $('#recBody');
  const r = REC.range || { t0: 0, t1: plan().total };
  const tl = plan();
  const planEv = tl.events.filter((e) => e.t0 >= r.t0 - 1 && e.t1 <= r.t1 + 1);
  const planSyl = planEv.filter((e) => e.type === 'syl');
  const planPauses = planEv.filter((e) => e.type === 'pause' && e.t1 - e.t0 >= 200);
  const planDur = (r.t1 - r.t0) / 1000;
  let h = '<audio controls src="' + REC.url + '"></audio><canvas id="recCv" width="1000" height="180" aria-label="Kayıt dalga biçimi"></canvas>';
  if (!res) {
    h += '<p class="mut" style="margin-top:10px">Kayıt çözümlenemedi, ancak yukarıdan dinleyebilirsin.</p>';
    body.innerHTML = h; return;
  }
  const sps = res.speech > 0 ? planSyl.length / res.speech : 0;
  h += '<div class="recbox"><div class="cmp">' +
    '<div><b>' + trNum(res.speech, 1) + ' sn</b><span>konuşma süren · plan ' + trNum(planDur, 1) + ' sn</span></div>' +
    '<div><b>' + res.inner.length + '</b><span>duraklaman · plan ' + planPauses.length + '</span></div>' +
    '<div><b>' + trNum(sps, 1) + '</b><span>hece/sn · normal ' + trNum(E.TEMPOS.normal.sps, 1) + '</span></div></div></div>';
  const longest = res.inner.reduce((m, s) => Math.max(m, (s.b - s.a) * 0.02), 0);
  const notes = [];
  if (sps && sps < E.TEMPOS.yavas.sps * 0.85) notes.push('Çok yavaş okudun; cümle akışı kopabilir. Normal hıza yaklaş.');
  else if (sps > E.TEMPOS.hizli.sps * 1.1) notes.push('Hızlısın; sözcük sonlarını yutmamaya dikkat et.');
  else notes.push('Hızın dengeli görünüyor.');
  if (res.inner.length < Math.round(planPauses.length * 0.6)) notes.push('Planlanandan az duraklamışsın; virgül ve noktada soluk almayı dene.');
  else if (res.inner.length > planPauses.length * 1.7 + 2) notes.push('Planlanandan çok duraklamışsın; ulama ile sözcükleri birbirine bağlamayı dene.');
  if (longest > 1.6) notes.push('En uzun sessizlik ' + trNum(longest, 1) + ' sn; cümle içinde takılmış olabilirsin.');
  h += '<ul class="kisa" style="margin:10px 0 0;padding-left:1.2em">' + notes.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  h += '<p class="mut" style="font-size:.78rem;margin-top:10px">Kırmızı bantlar kaydındaki duraklar, altın çizgiler planlanan duraklardır. Altın eğri, sesinin perdesini <b>deneysel</b> olarak gösterir; bir değerlendirme değil, kendi kulağın için bir yardımcıdır.</p>';
  body.innerHTML = h;
  drawRec(res, planPauses, r);
}

function drawRec(res, planPauses, r) {
  const cv = $('#recCv'); if (!cv) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const css = getComputedStyle(document.documentElement);
  const col = (n) => css.getPropertyValue(n).trim() || '#888';
  g.clearRect(0, 0, W, H);
  g.fillStyle = col('--bg2'); g.fillRect(0, 0, W, H);
  const n = res.n, bw = W / n;
  // duraklar
  g.fillStyle = 'rgba(255,84,112,.22)';
  res.inner.forEach((s) => g.fillRect(s.a * bw, 0, (s.b - s.a) * bw, H));
  // dalga
  g.fillStyle = col('--c-ince');
  for (let i = 0; i < n; i++) { const v = Math.min(1, res.rms[i] / (res.p95 * 1.4 || 1)); const h = Math.max(1.5, v * (H * 0.82)); g.globalAlpha = res.voiced[i] ? 0.95 : 0.35; g.fillRect(i * bw, H / 2 - h / 2, Math.max(1, bw - 0.6), h); }
  g.globalAlpha = 1;
  // planlanan duraklar (ölçekli)
  const planDur = r.t1 - r.t0, sp0 = res.first * 0.02, spN = res.speech || res.dur;
  g.strokeStyle = col('--c-vurgu'); g.lineWidth = 2; g.setLineDash([5, 5]);
  planPauses.forEach((e) => { const x = (sp0 + ((e.t0 - r.t0) / planDur) * spN) / res.dur * W; g.beginPath(); g.moveTo(x, 6); g.lineTo(x, H - 6); g.stroke(); });
  g.setLineDash([]);
  // perde çizgisi
  const ps = Array.from(res.pitch).filter((v) => v > 0).sort((a, b) => a - b);
  if (ps.length > 8) {
    const med = ps[Math.floor(ps.length / 2)];
    g.strokeStyle = col('--brand'); g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
    let pen = false;
    for (let i = 0; i < n; i++) {
      const v = res.pitch[i];
      if (v > 0) { const st = 12 * Math.log2(v / med); const y = H / 2 - clamp(st, -9, 9) / 9 * (H * 0.4); const x = i * bw; if (!pen) { g.moveTo(x, y); pen = true; } else g.lineTo(x, y); } else pen = false;
    }
    g.stroke();
  }
}

function bindRecord() { $('#btnRec').addEventListener('click', recToggle); }
