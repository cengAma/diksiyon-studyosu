/* ==========================================================================
   Rapor: metnin genel görünümü, zor sözcükler, uyarılar, çalışma önerileri
   ========================================================================== */
const CODE_TASKS = [
  { codes: ['E_ACIK', 'E_KAPALI', 'E_KAPALI_ISTISNA'], title: 'Açık ve kapalı e', why: 'e harfi açık da kapalı da söylenir; hece sonuna bak.', letter: 'e' },
  { codes: ['N_M', 'N_NG', 'N_M_SINIR'], title: 'n harfinin dönüşümü (n → m, ng)', why: 'b/p ve k/g önünde n değişir.', letter: 'n' },
  { codes: ['L_INCE', 'K_INCE', 'G_INCE'], title: 'Kalın ve ince l, k, g', why: 'Yanındaki ünlü ünsüzün rengini belirler.', letter: 'l' },
  { codes: ['G_UZAT'], title: 'Yumuşak g (ğ)', why: 'ğ ünlüyü uzatır; ayrı bir ses gibi söylenmez.', letter: 'ğ' },
  { codes: ['H_NET'], title: 'h harfini duyur', why: 'Başta, ortada ve sonda h yutulmasın.', letter: 'h' },
  { codes: ['V_YUMUSAK', 'V_SON'], title: 'v harfi', why: 'Yuvarlak ünlüler arasında yumuşar, sonda f olmaz.', letter: 'v' },
  { codes: ['SON_YOR', 'SON_R'], title: 'Sondaki r ve -yor eki', why: 'Sondaki ünsüzler yarıda bırakılmasın.', letter: 'r' },
  { codes: ['KUME_BASI', 'KUME_UC', 'KUME_SON'], title: 'Zor ünsüz kümeleri', why: 'Araya ünlü ekleme: tren, kırk, Türkçe.', twisters: true },
  { codes: ['ULAMA'], title: 'Ulama', why: 'Ünsüzle biten sözcük ünlüyle başlayanla bağlanır.', liaison: true },
  { codes: ['IKI_UNLU'], title: 'Yan yana iki ünlü', why: 'saat, kaan gibi sözcüklerde iki ayrı hece.', letter: 'a' },
  { codes: ['CIFT_UNSUZ'], title: 'Çift ünsüz', why: 'anne, hissetmek: iki ünsüz de duyulur.', letter: 'n' },
  { codes: ['HATA_SIK'], title: 'Sık yapılan hatalar', why: 'yalnız/yanlış, herkes gibi sözcükler.', mistakes: true }
];

function renderReport() {
  const root = $('#report');
  if (!App.A || !App.A.sentences.length) {
    root.innerHTML = '<h2>Metin raporu</h2><p class="sub">Bir metin çözümlediğinde burada genel görünümü, zor sözcükleri ve çalışma önerilerini görürsün.</p><div class="box"><div class="empty">' + ic('list') + '<b>Henüz çözümlenmiş metin yok</b><button class="btn pri" id="rpGo" style="margin-top:12px">Metin ekle</button></div></div>';
    $('#rpGo').addEventListener('click', () => goView('read'));
    return;
  }
  const A = App.A, st = A.stats;
  const counts = layerCounts(A);
  const t = (sps) => E.buildTimeline(A, { sps }).total;
  const tN = t(E.TEMPOS.normal.sps);
  const hmax = Math.max.apply(null, A.sentences.map((x) => x.score));
  let h = '<h2>Metin raporu</h2><p class="sub">Metnin nerelerinde ne yapman gerektiğini özetler. Sayılar, kılavuzdaki kurallardan türetilir; “genel eğilim” etiketli kurallar için hocanın söyleyişi esastır.</p>';
  h += '<div class="tools"><button class="btn sm" id="rpCopy">' + ic('copy') + 'İşaretli metni kopyala</button><button class="btn sm" id="rpTxt">' + ic('download') + 'İndir (.txt)</button><button class="btn sm" id="rpPrint">' + ic('print') + 'Yazdır / PDF</button><button class="btn sm" id="rpShare">' + ic('link') + 'Bağlantıyı kopyala</button></div>';
  h += '<div class="tiles">' +
    tile(st.sentences, 'cümle') + tile(st.words, 'sözcük') + tile(st.syl, 'hece') +
    '<div class="tile"><b>' + fmtTime(tN) + '</b><span>normal hızda okuma süresi</span></div>' +
    tile(st.warn, 'dikkat edilecek yer') + tile(st.tip, 'ipucu') + '</div>';

  h += '<div class="box"><h3>Cümle cümle zorluk <small>çubuğa tıkla, o cümleye git</small></h3><div class="heat" id="heat">' +
    A.sentences.map((S, i) => '<button type="button" data-si="' + i + '" class="' + (S.score > 1.5 ? 'hi' : '') + '" style="--h:' + clamp(S.score / Math.max(1.5, hmax), 0.04, 1).toFixed(2) + ';--i:' + Math.min(i, 40) + '" title="' + (i + 1) + '. cümle · zorluk ' + trNum(S.score, 1) + '" aria-label="' + (i + 1) + '. cümleye git"></button>').join('') + '</div></div>';

  const lc = LAYERS.filter((l) => counts[l.id] > 0 && l.id !== 'heceler').sort((a, b) => counts[b.id] - counts[a.id]);
  const mx = Math.max(1, ...lc.map((l) => counts[l.id]));
  h += '<div class="grid2"><div class="box"><h3>Hangi kural ne kadar çalışıyor?</h3><div class="hbars">' +
    lc.map((l, i) => '<div class="hbar" style="--lc:var(' + l.col + ');--i:' + i + '"><span>' + esc(l.name) + '</span><div class="b"><i data-p="' + (counts[l.id] / mx).toFixed(3) + '"></i></div><span class="n">' + counts[l.id] + '</span></div>').join('') + '</div></div>';

  h += '<div class="box"><h3>Zor sözcükler <small>tıkla, laboratuvarda aç</small></h3>';
  h += st.hard.length ? '<div class="hard">' + st.hard.map((w) => '<button type="button" data-gi="' + w.gi + '"><b>' + esc(w.text) + '</b><span>' + esc(w.say) + ' · zorluk ' + trNum(w.score, 1) + '</span></button>').join('') + '</div>' : '<p class="kisa">Bu metinde özellikle zor bir sözcük çıkmadı.</p>';
  h += '</div></div>';

  // uyarılar
  const al = [];
  A.sentences.forEach((S, i) => {
    if (S.breathAlerts && S.breathAlerts.length) al.push({ si: i, txt: (i + 1) + '. cümle: ' + S.breathAlerts[0].why });
    else if (S.stats.syl > 44) al.push({ si: i, txt: (i + 1) + '. cümle çok uzun (' + S.stats.syl + ' hece); araya durak koymayı düşün.' });
  });
  A.words.forEach((w) => { const m = w.marks.find((x) => x.code === 'HATA_SIK'); if (m) al.push({ gi: w.gi, txt: '“' + w.text + '” — ' + m.text }); });
  h += '<div class="box"><h3>Uyarılar <small>' + al.length + '</small></h3>';
  h += al.length ? '<ul class="alerts">' + al.slice(0, 14).map((a, i) => '<li><span>' + esc(a.txt) + '</span><button class="btn sm" type="button" data-' + (a.si != null ? 'si="' + a.si : 'gi="' + a.gi) + '">Git</button></li>').join('') + '</ul>' : '<p class="kisa">Dikkat çeken bir uyarı yok; soluk planı rahat görünüyor.</p>';
  h += '</div>';

  // çalışma önerileri
  const tasks = CODE_TASKS.map((tk) => ({ tk, n: tk.codes.reduce((a, c) => a + (st.marks[c] || 0), 0) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
  h += '<div class="box"><h3>Bu metin için çalışma sırası</h3>';
  h += tasks.length ? '<ol class="todo">' + tasks.map((x, i) => '<li><span><b>' + esc(x.tk.title) + '</b> · ' + x.n + ' yer<br><span class="mut" style="font-size:.84rem">' + esc(x.tk.why) + '</span></span><button class="btn sm" type="button" data-task="' + CODE_TASKS.indexOf(x.tk) + '">Alıştır</button></li>').join('') + '</ol>' : '<p class="kisa">Metin sade; yine de okuma akışını karaoke ile dene.</p>';
  h += '</div>';

  h += '<div class="box"><h3>İşaretli metin <small>/ kısa durak · // durak ve soluk · _vurgu odağı_ · ‿ ulama</small></h3><div class="marked" id="rpMarked"></div></div>';
  root.innerHTML = h;
  $('#rpMarked').textContent = E.exportMarked(A);
  // animasyonlar
  requestAnimationFrame(() => requestAnimationFrame(() => { $$('#report .hbar .b i').forEach((i) => { i.style.setProperty('--p', i.dataset.p); }); }));
  $$('#report .tile b[data-n]').forEach((b) => countTo(b, +b.dataset.n));
  bindReport();
}
function tile(n, label) { return '<div class="tile"><b class="num" data-n="' + n + '">0</b><span>' + esc(label) + '</span></div>'; }

function bindReport() {
  const root = $('#report');
  root.onclick = (e) => {
    const heat = e.target.closest('#heat button');
    if (heat) { goView('read'); setTimeout(() => { selectSentence(+heat.dataset.si, { quiet: false }); const el = $('#stage .sent[data-si="' + heat.dataset.si + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 120); return; }
    const hd = e.target.closest('.hard button');
    if (hd) { openWordInRead(+hd.dataset.gi); return; }
    const al = e.target.closest('.alerts button');
    if (al) { if (al.dataset.gi != null) openWordInRead(+al.dataset.gi); else { goView('read'); setTimeout(() => { selectSentence(+al.dataset.si); const el = $('#stage .sent[data-si="' + al.dataset.si + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 120); } return; }
    const tk = e.target.closest('[data-task]');
    if (tk) { const t = CODE_TASKS[+tk.dataset.task]; goView('practice'); setTimeout(() => practiceFocus(t), 80); return; }
    if (e.target.closest('#rpCopy')) { copyText(E.exportMarked(App.A), 'İşaretli metin kopyalandı'); return; }
    if (e.target.closest('#rpTxt')) { downloadText('diksiyon-isaretli-metin.txt', E.exportMarked(App.A)); return; }
    if (e.target.closest('#rpPrint')) { goView('read'); setTimeout(() => window.print(), 250); return; }
    if (e.target.closest('#rpShare')) { shareLink(); return; }
  };
}
function openWordInRead(gi) {
  goView('read');
  setTimeout(() => { selectWord(gi); const el = $('#stage .w[data-gi="' + gi + '"]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 120);
}

function copyText(txt, msg) {
  const done = () => toast(msg || 'Kopyalandı', 1800);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
  else fallbackCopy(txt, done);
}
function fallbackCopy(txt, done) {
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Kopyalanamadı', 1800); }
  ta.remove();
}
function downloadText(name, txt) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function shareLink() {
  const t = App.text || '';
  if (!t) return;
  let b64 = '';
  try { b64 = btoa(unescape(encodeURIComponent(t))); } catch (e) { toast('Bağlantı oluşturulamadı', 2000); return; }
  const url = location.href.split('#')[0] + '#t=' + b64;
  if (url.length > 6000) { toast('Metin bağlantı için çok uzun; kısalt ya da .txt indir.', 3200); return; }
  history.replaceState(null, '', '#t=' + b64);
  copyText(url, 'Bağlantı kopyalandı · metin bağlantının içinde, sunucuya gitmez');
}
