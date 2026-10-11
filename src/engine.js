/* ==========================================================================
   Diksiyon Stüdyosu — Türkçe diksiyon kural motoru
   Saf JavaScript, bağımlılıksız; hem tarayıcıda hem Node'da çalışır.
   Kurallar "Türkçe Diksiyon Kılavuzu"ndan alınmıştır (Bölüm 4-9).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DiksiyonEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  1. Yardımcılar
   * ------------------------------------------------------------------ */
  const trLower = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  const trUpper = (s) => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  const cap = (s) => (s ? trUpper(s[0]) + s.slice(1) : s);

  const VOWELS = 'aeıioöuü';
  const FRONT = 'eiöü';
  const BACK = 'aıou';
  const ROUND = 'oöuü';
  const isVowelN = (c) => VOWELS.indexOf(c) >= 0;
  const LETTER_RE = /[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîûÉéÈèÊêÁáÀàÓóÒòÚúÙùÑñÄäËëÏïÔôÛû]/;
  const isLetter = (c) => !!c && LETTER_RE.test(c);
  const isDigit = (c) => c >= '0' && c <= '9';
  const isUpper = (c) => c !== trLower(c);
  const FOREIGN = { 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'á': 'a', 'à': 'a', 'ä': 'a', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ú': 'u', 'ù': 'u', 'ñ': 'n', 'ï': 'i', 'q': 'k', 'w': 'v', 'x': 'k' };

  /** harfi (küçük, şapkasız) tabana çevirir */
  function baseOf(ch) {
    let c = trLower(ch);
    if (c === 'â') return 'a';
    if (c === 'î') return 'i';
    if (c === 'û') return 'u';
    if (FOREIGN[c]) return FOREIGN[c];
    return c;
  }
  const isCirc = (ch) => /[âîûÂÎÛ]/.test(ch);

  const LETTER_NAMES = {
    a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'yumuşak ge', h: 'he', ı: 'ı', i: 'i', j: 'je', k: 'ke',
    l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've', y: 'ye', z: 'ze',
    w: 'çift ve', x: 'iks', q: 'kü'
  };

  /* ------------------------------------------------------------------ *
   *  2. Sözlükler (Hoca modunda genişletilebilir)
   * ------------------------------------------------------------------ */
  const LEX = {
    /* l / k / g'nin ince söylendiği alıntı sözcük kökleri (a, o, u yanında bile) */
    inceStems: ['kalp', 'kalb', 'alkol', 'rol', 'gol', 'futbol', 'basketbol', 'voleybol', 'petrol', 'konsol', 'protokol', 'kontrol', 'lüzum', 'sol'.slice(0, 0)].filter(Boolean),
    /* e'nin çoğunlukla kapalı söylendiği istisnalar: kök -> hece indeksi listesi (kılavuz: kendi, hem, genç) */
    eKapaliExc: { kendi: [0], hem: [0], genç: [0], kendim: [0], kendin: [0], kendisi: [0], kendimiz: [0] },
    /* vurgunun sondan farklı olduğu sözcükler (kök -> hece indeksi, 0'dan) */
    stress: {
      şimdi: 0, ancak: 0, belki: 0, yalnız: 0, hemen: 0, sadece: 0, nasıl: 0, neden: 0, niçin: 0, kimse: 0, herkes: 0, bazen: 0,
      çünkü: 0, fakat: 0, lakin: 0, veya: 0, öyle: 0, böyle: 0, şöyle: 0, ayrıca: 0, sanki: 0, hiçbir: 0, bugün: 0,
      nerede: 0, nereye: 0, nereden: 0, hangisi: 0, sonra: 0, önce: 0, hâlâ: 0, hala: 0, zaten: 0
    },
    /* iki heceli / uzun yer adları için il listesi (Sezer kuralı ile vurgu) */
    places: ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak', 'Çanakkale', 'Alanya', 'Bodrum', 'Marmaris', 'Fethiye', 'Ürgüp', 'Göreme', 'Ayvalık', 'Bandırma', 'Çeşme', 'Kuşadası', 'Beşiktaş', 'Kadıköy', 'Üsküdar', 'Taksim', 'Ege', 'Anadolu', 'Karadeniz', 'Akdeniz', 'Marmara', 'Türkiye'],
    /* -ça / -çe zarfları (ek vurgusuz, vurgu önceki hecede) */
    advCa: ['yavaşça', 'sakince', 'kısaca', 'açıkça', 'ayrıca', 'güzelce', 'hızlıca', 'uzunca', 'kolayca', 'rahatça', 'dikkatlice', 'özetle', 'tamamen'],
    /* sık yanlış söylenen sözcükler (kılavuz Bölüm 9) — doğru biçim -> uyarı */
    mistakes: [
      { re: /^yalnız/, wrong: 'yanlız', note: '"l" ve "n" yer değiştirmesin' },
      { re: /^yanlış/, wrong: 'yalnış', note: '"n" ve "l" yer değiştirmesin' },
      { re: /^herkes/, wrong: 'herkez', note: 'Sondaki "s" ötümsüz kalmalı' },
      { re: /yor(um|sun|uz|sunuz|lar|du|dum|dun|duk|dunuz|muş|sa)?$/, wrong: null, note: null }, // -yor ayrı kuralda
      { re: /^yapacağ|^edeceğ|^gideceğ|^geleceğ|^söyleyeceğ|^olacağ|^alacağ|^vereceğ|^bakacağ/, wrong: 'yapıcam', note: '"-acağım" eki tam söylenir' },
      { re: /^daha$/, wrong: 'daa', note: '"h" yutulmaz' },
      { re: /^orijinal/, wrong: 'orjinal', note: 'Ortadaki "i" atlanmaz' },
      { re: /^şoför/, wrong: 'şöför', note: '"o" ve "ö" karışmaz' },
      { re: /^hastane/, wrong: 'hastahane', note: 'Fazladan "ha" eklenmez' }
    ],
    /* kısaltmalar */
    abbr: {
      'Sn.': 'sayın', 'Dr.': 'doktor', 'Prof.': 'profesör', 'Doç.': 'doçent', 'Av.': 'avukat', 'Müh.': 'mühendis', 'Müd.': 'müdür',
      'Yrd.': 'yardımcı', 'Uzm.': 'uzman', 'vb.': 've benzeri', 'vs.': 'vesaire', 'örn.': 'örneğin', 'Cad.': 'caddesi', 'Sok.': 'sokağı',
      'Mah.': 'mahallesi', 'No.': 'numara', 'Tel.': 'telefon', 'A.Ş.': 'anonim şirketi', 'Ltd.': 'limited', 'Şti.': 'şirketi',
      'Bkz.': 'bakınız', 'bkz.': 'bakınız', 'dk.': 'dakika', 'yy.': 'yüzyıl', 'Gen.': 'general', 'Alb.': 'albay', 'Bşk.': 'başkan', 'T.C.': 'türkiye cumhuriyeti'
    },
    units: { kg: 'kilogram', km: 'kilometre', cm: 'santimetre', mm: 'milimetre', ml: 'mililitre', lt: 'litre', gr: 'gram', mt: 'metre', dk: 'dakika', sn: 'saniye', sa: 'saat', TL: 'lira', USD: 'dolar', EUR: 'avro', GB: 'gigabayt', MB: 'megabayt' },
    knownAcr: ['AVM', 'ABD', 'AB', 'TV', 'PDF', 'USB', 'CEO', 'SMS', 'GSM', 'CV', 'DVD', 'SGK', 'PTT', 'THY', 'EFT', 'İK', 'TC', 'LGS', 'YKS', 'KPSS', 'BDDK', 'KDV', 'TRT', 'TBMM', 'TSK', 'MEB', 'YÖK', 'ÖSYM', 'IT', 'AI', 'AR', 'VR', 'ISO', 'FAQ', 'URL', 'HTTP', 'HTML', 'CSS', 'API'],
    acrWords: ['NASA', 'TÜBİTAK', 'ASELSAN', 'ODTÜ', 'TOBB', 'UNICEF', 'UNESCO', 'NATO', 'İSKİ', 'ASKİ', 'BİM', 'ŞOK', 'TOGG', 'TÜİK', 'EXPO', 'COVID'],
    months: ['', 'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'],
    /* soluk için uygun bağlaçlar (uzun cümlede öneri noktası) */
    breathWords: ['ve', 'ama', 'fakat', 'ancak', 'çünkü', 'veya', 'ya', 'ki', 'oysa', 'ayrıca', 'ardından', 'sonra', 'ile', 'hem', 'ne'],
    intro: ['aslında', 'çünkü', 'yani', 'ayrıca', 'örneğin', 'fakat', 'ancak', 'ama', 'üstelik', 'dolayısıyla', 'ayrıca', 'sonuç', 'neticede'],
    whWords: ['kim', 'kime', 'kimin', 'kimi', 'ne', 'neyi', 'neden', 'niçin', 'nasıl', 'nerede', 'nereye', 'nereden', 'kaç', 'kaçta', 'hangi', 'hangisi', 'ne zaman', 'kaçıncı', 'niye', 'nedir', 'kimdir'],
    clitics: ['de', 'da', 'ki', 'mi', 'mı', 'mu', 'mü', 'misin', 'mısın', 'musun', 'müsün', 'miyim', 'mıyım', 'muyum', 'müyüm', 'miyiz', 'mıyız', 'muyuz', 'müyüz', 'misiniz', 'mısınız', 'musunuz', 'müsünüz', 'midir', 'mıdır', 'mudur', 'müdür', 'miydi', 'mıydı', 'muydu', 'müydü', 'miymiş', 'mıymış'],
    imperStart: ['hemen', 'lütfen', 'hadi', 'bak', 'dinle', 'sakın', 'şimdi']
  };

  /* Hoca modu: çalışma anında eklenen istisnalar buraya birleşir. */
  function mergeLexicon(user) {
    if (!user || (!Object.keys(user.stress || {}).length && !Object.keys(user.eKapali || {}).length && !(user.ince || []).length)) return LEX;
    const L = Object.assign({}, LEX);
    L.userStress = user.stress || {};
    L.userE = user.eKapali || {};
    L.userInce = user.ince || [];
    return L;
  }

  /* ------------------------------------------------------------------ *
   *  3. Sayılar ve kısaltmalar → okunuş
   * ------------------------------------------------------------------ */
  const ONES = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  const SCALES = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon'];

  function below1000(n) {
    const parts = [];
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    if (h) parts.push(h === 1 ? 'yüz' : ONES[h] + ' yüz');
    if (t) parts.push(TENS[t]);
    if (o) parts.push(ONES[o]);
    return parts.join(' ');
  }
  function numToWords(str) {
    // str: yalnız rakamlardan oluşur
    str = str.replace(/^0+(?=\d)/, (m) => '');
    if (str.length > 18) return str.split('').map((d) => ONES[+d]).join(' ');
    let n = BigInt(str);
    if (n === 0n) return 'sıfır';
    const groups = [];
    while (n > 0n) { groups.push(Number(n % 1000n)); n /= 1000n; }
    const out = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (!g) continue;
      if (i === 1 && g === 1) out.push('bin');
      else out.push(below1000(g) + (SCALES[i] ? ' ' + SCALES[i] : ''));
    }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }
  const digitsRead = (s) => s.split('').map((d) => ONES[+d]).join(' ');

  /** sayı dizgisini (virgül/nokta içerebilir) okunuşa çevirir */
  function readNumber(s) {
    s = s.trim();
    if (/^0\d/.test(s) && !/[.,]/.test(s)) return digitsRead(s); // telefon vb.
    let intPart = s, dec = null;
    const m = s.match(/^(\d{1,3}(?:\.\d{3})+|\d+),(\d+)$/);
    if (m) { intPart = m[1]; dec = m[2]; }
    else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) intPart = s;
    else if (/^\d+\.\d+$/.test(s)) { const p = s.split('.'); intPart = p[0]; dec = p[1]; }
    intPart = intPart.replace(/\./g, '');
    let words = numToWords(intPart);
    if (dec !== null) {
      const dw = /^0/.test(dec) ? digitsRead(dec) : numToWords(dec);
      words += ' virgül ' + dw;
    }
    return words;
  }

  /** harf adlarıyla okunacak kısaltma mı? */
  function acronymKind(tok) {
    const up = trUpper(tok);
    if (tok !== up || tok.length < 2 || tok.length > 7) return null;
    if (LEX.acrWords.indexOf(up) >= 0) return 'word';
    if (LEX.knownAcr.indexOf(up) >= 0) return 'letters';
    const hasV = /[AEIİOÖUÜ]/.test(up);
    if (!hasV && up.length <= 5) return 'letters';
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  4. Tokenizer
   * ------------------------------------------------------------------ */
  const OPEN_Q = '“«‘', CLOSE_Q = '”»’';
  const ABBR_KEYS = Object.keys(LEX.abbr).sort((a, b) => b.length - a.length);

  function tokenize(text) {
    const T = [];
    const n = text.length;
    let i = 0, nl = 0, quoteOpen = false, gid = 0;
    const push = (t) => T.push(t);
    const prevCh = () => (i > 0 ? text[i - 1] : '');
    while (i < n) {
      const ch = text[i];
      if (ch === '\n' || ch === '\r') { if (ch === '\n') nl++; i++; continue; }
      if (/\s/.test(ch)) { i++; continue; }
      if (nl > 0) { push({ type: 'nl', count: nl }); nl = 0; }

      // kısaltma sözlüğü
      let abbrHit = null;
      if (isLetter(ch) && !isLetter(prevCh())) {
        for (const k of ABBR_KEYS) {
          if (text.startsWith(k, i) && !isLetter(text[i + k.length] || ' ')) { abbrHit = k; break; }
        }
      }
      if (abbrHit) {
        const words = LEX.abbr[abbrHit].split(' ');
        const g = { id: 'g' + (gid++), text: abbrHit, kind: 'kısaltma' };
        words.forEach((w, k) => push({ type: 'word', text: w, group: { id: g.id, text: g.text, kind: g.kind, i: k, n: words.length } }));
        i += abbrHit.length;
        continue;
      }

      // sayılar
      if (isDigit(ch) || ((ch === '%' || ch === '₺' || ch === '$' || ch === '€') && isDigit(text[i + 1] || ''))) {
        let pre = '';
        if (ch === '%' || ch === '₺' || ch === '$' || ch === '€') { pre = ch; i++; }
        let j = i;
        while (j < n && (isDigit(text[j]) || ((text[j] === '.' || text[j] === ',' || text[j] === ':') && isDigit(text[j + 1] || '')))) j++;
        let numStr = text.slice(i, j);
        let suffix = '';
        let k = j;
        let percent = pre === '%';
        let cur = pre === '₺' ? 'lira' : pre === '$' ? 'dolar' : pre === '€' ? 'avro' : '';
        if (text[k] === '%') { percent = true; k++; }
        // ek: 'inci, 'de ...
        if ((text[k] === "'" || text[k] === '’') && isLetter(text[k + 1] || '')) {
          let e = k + 1;
          while (e < n && isLetter(text[e])) e++;
          suffix = trLower(text.slice(k + 1, e));
          k = e;
        } else if (isLetter(text[k] || '') && /^(inci|ıncı|uncu|üncü|nci|ncı|ncu|ncü|er|ar|ş|lik|lık)$/.test(text.slice(k, k + 4)) === false) {
          // bitişik birim (kg, km, TL ...)
          let e = k;
          while (e < n && isLetter(text[e])) e++;
          const unit = text.slice(k, e);
          if (LEX.units[unit]) { cur = LEX.units[unit]; k = e; }
        }
        // " TL" (boşluklu birim)
        if (!cur) {
          const m = text.slice(k).match(/^\s+(TL|USD|EUR|kg|km|cm|mm|ml|lt|gr|GB|MB)\b/);
          if (m) { cur = LEX.units[m[1]]; k += m[0].length; }
        }
        const g = { id: 'g' + (gid++), text: text.slice(i - (pre ? 1 : 0), k), kind: 'sayı' };
        let spoken;
        let m;
        if ((m = numStr.match(/^(\d{1,2}):(\d{2})$/))) {
          spoken = numToWords(m[1]) + (m[2] === '00' ? '' : ' ' + (m[2][0] === '0' ? 'sıfır ' : '') + numToWords(m[2]));
        } else if ((m = numStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)) && +m[2] >= 1 && +m[2] <= 12) {
          spoken = numToWords(m[1]) + ' ' + LEX.months[+m[2]] + ' ' + numToWords(m[3]);
        } else {
          spoken = readNumber(numStr);
        }
        let words = spoken.split(' ').filter(Boolean);
        if (percent) words = ['yüzde'].concat(words);
        if (cur) words.push(cur);
        if (suffix) {
          // son sözcüğe ek: dört -> dörd-
          let last = words[words.length - 1];
          if (/^[aeıioöuü]/.test(suffix) && /t$/.test(last) && last === 'dört') last = 'dörd';
          words[words.length - 1] = last + suffix;
        }
        // ordinal satır başı: "1." -> birinci
        words.forEach((w, q) => push({ type: 'word', text: w, group: words.length > 1 || true ? { id: g.id, text: g.text, kind: g.kind, i: q, n: words.length } : null }));
        i = k;
        continue;
      }

      // harf dizisi (kelime)
      if (isLetter(ch)) {
        let j = i;
        while (j < n && (isLetter(text[j]) || ((text[j] === "'" || text[j] === '’') && isLetter(text[j + 1] || '') && isLetter(text[j - 1] || '')))) j++;
        const raw = text.slice(i, j);
        const kind = acronymKind(raw);
        if (kind === 'letters') {
          const lets = Array.from(trLower(raw).replace(/i̇/g, 'i'));
          const g = { id: 'g' + (gid++), text: raw, kind: 'kısaltma' };
          const names = lets.map((c) => LETTER_NAMES[c] || c);
          names.forEach((nm, q) => push({ type: 'word', text: nm, group: { id: g.id, text: g.text, kind: g.kind, i: q, n: names.length } }));
        } else {
          let t = raw;
          if (kind === 'word' || (t.length > 3 && t === trUpper(t) && /[AEIİOÖUÜ]/.test(t))) t = cap(trLower(t));
          push({ type: 'word', text: t, group: null, upperOrig: raw === trUpper(raw) && raw.length > 1 });
        }
        i = j;
        // tire ile bağlı
        if (text[i] === '-' && isLetter(text[i + 1] || '')) { push({ type: 'glue', ch: '-' }); i++; }
        continue;
      }

      // noktalama / semboller
      if (ch === '.' || ch === '…') {
        let j = i;
        while (j < n && (text[j] === '.' || text[j] === '…')) j++;
        const run = text.slice(i, j);
        push({ type: 'punct', ch: run.length > 1 || ch === '…' ? '…' : '.' });
        i = j; continue;
      }
      if (ch === '?' || ch === '!') {
        let j = i;
        while (j < n && (text[j] === '?' || text[j] === '!')) j++;
        const run = text.slice(i, j);
        push({ type: 'punct', ch: run.indexOf('?') >= 0 ? (run.indexOf('!') >= 0 ? '?!' : '?') : '!' });
        i = j; continue;
      }
      if (ch === ',' || ch === ';' || ch === ':') { push({ type: 'punct', ch }); i++; continue; }
      if (ch === '–' || ch === '—' || ch === '-') { push({ type: 'punct', ch: '—' }); i++; continue; }
      if (ch === '"') { push({ type: 'quote', open: !quoteOpen, ch }); quoteOpen = !quoteOpen; i++; continue; }
      if (OPEN_Q.indexOf(ch) >= 0 && !(ch === '’')) { push({ type: 'quote', open: true, ch }); i++; continue; }
      if (CLOSE_Q.indexOf(ch) >= 0) { push({ type: 'quote', open: false, ch }); i++; continue; }
      if (ch === "'") { push({ type: 'quote', open: !quoteOpen, ch }); quoteOpen = !quoteOpen; i++; continue; }
      if (ch === '(' || ch === '[') { push({ type: 'paren', open: true, ch }); i++; continue; }
      if (ch === ')' || ch === ']') { push({ type: 'paren', open: false, ch }); i++; continue; }
      if (ch === '&') { push({ type: 'word', text: 've', group: { id: 'g' + (gid++), text: '&', kind: 'sembol', i: 0, n: 1 } }); i++; continue; }
      if (ch === '+' && /\s/.test(prevCh() || ' ')) { push({ type: 'word', text: 'artı', group: { id: 'g' + (gid++), text: '+', kind: 'sembol', i: 0, n: 1 } }); i++; continue; }
      if (ch === '=') { push({ type: 'word', text: 'eşittir', group: { id: 'g' + (gid++), text: '=', kind: 'sembol', i: 0, n: 1 } }); i++; continue; }
      if (ch === '°') { push({ type: 'word', text: 'derece', group: { id: 'g' + (gid++), text: '°', kind: 'sembol', i: 0, n: 1 } }); i++; continue; }
      i++; // diğer semboller yok sayılır
    }
    return T;
  }

  /* ------------------------------------------------------------------ *
   *  5. Hece ayırıcı
   * ------------------------------------------------------------------ */
  const ONSET2 = ['tr', 'kr', 'pr', 'br', 'dr', 'gr', 'fr', 'kl', 'pl', 'bl', 'gl', 'fl', 'sk', 'sp', 'st', 'sl', 'sm', 'sn', 'şt', 'vr'];

  /** nSeq: küçük harfli, şapkasız, apostrofsuz dizi → [{from,to}] */
  function syllabify(nSeq) {
    const L = nSeq.length;
    const vIdx = [];
    for (let i = 0; i < L; i++) if (isVowelN(nSeq[i])) vIdx.push(i);
    if (vIdx.length <= 1) return [{ from: 0, to: L }];
    const cuts = []; // her hece başlangıcı (ilk hariç)
    for (let k = 0; k < vIdx.length - 1; k++) {
      const a = vIdx[k], b = vIdx[k + 1];
      const nc = b - a - 1;
      let cut;
      if (nc === 0) cut = b;
      else if (nc === 1) cut = a + 1;
      else if (nc === 2) cut = a + 2;
      else if (nc === 3) {
        const c0 = nSeq[a + 1], pair = nSeq[a + 2] + nSeq[a + 3];
        cut = (ONSET2.indexOf(pair) >= 0 && 'lrnm'.indexOf(c0) < 0) ? a + 2 : a + 3;
      } else cut = a + 3;
      cuts.push(cut);
    }
    const syl = [];
    let s = 0;
    for (const c of cuts) { syl.push({ from: s, to: c }); s = c; }
    syl.push({ from: s, to: L });
    return syl;
  }

  /* ------------------------------------------------------------------ *
   *  6. Kelime çözümleme
   * ------------------------------------------------------------------ */
  const REF = {
    e: { sec: 'Bölüm 5', card: 'e kartı' },
    n: { sec: 'Bölüm 6', card: 'n kartı' },
    l: { sec: 'Bölüm 6', card: 'l kartı' },
    k: { sec: 'Bölüm 6', card: 'k kartı' },
    g: { sec: 'Bölüm 6', card: 'g kartı' },
    gg: { sec: 'Bölüm 6', card: 'ğ kartı' },
    v: { sec: 'Bölüm 6', card: 'v kartı' },
    h: { sec: 'Bölüm 6', card: 'h kartı' },
    r: { sec: 'Bölüm 6', card: 'r kartı' },
    s7: { sec: 'Bölüm 7', card: 'Özel durumlar' },
    vv: { sec: 'Bölüm 5', card: 'Yan yana iki ünlü' },
    vurgu: { sec: 'Bölüm 8', card: 'Kelime vurgusu' },
    ulama: { sec: 'Bölüm 8', card: 'Ulama' },
    kume: { sec: 'Bölüm 10', card: 'Zor ünsüz kümeleri' },
    hata: { sec: 'Bölüm 9', card: 'Sık yanlış söylenen sözcükler' },
    cift: { sec: 'Bölüm 7', card: 'Diğer ünsüz olayları' }
  };

  let _mid = 0;
  function addMark(w, m) {
    m.id = 'm' + (++_mid);
    m.at = m.at || [];
    m.sev = m.sev || 'info';
    m.conf = m.conf || 'kesin';
    w.marks.push(m);
    for (const idx of m.at) { if (w.letters[idx]) w.letters[idx].tags.push(m.id); }
    return m;
  }

  function sylText(w, si) { const s = w.syl[si]; return w.letters.slice(s.from, s.to).map((l) => l.ch).join(''); }

  /** harf dizisinden kelime nesnesi kurar */
  function buildWord(raw, opts) {
    opts = opts || {};
    const LX = opts.lex || LEX;
    const letters = [];
    const aposAfter = {};
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "'" || ch === '’') { aposAfter[letters.length - 1] = ch; continue; }
      if (!isLetter(ch)) continue;
      const n = baseOf(ch);
      letters.push({ ch, n, circ: isCirc(ch), v: isVowelN(n), syl: 0, tags: [] });
    }
    const w = {
      text: raw, norm: letters.map((l) => l.n).join(''), letters, aposAfter, syl: [], marks: [],
      stress: { syl: -1, rule: 'none', conf: 'kesin', why: '' }, flags: {}, score: 0, say: ''
    };
    if (!letters.length) return w;
    w.syl = syllabify(letters.map((l) => l.n));
    w.syl.forEach((s, si) => { s.i = si; s.text = ''; for (let k = s.from; k < s.to; k++) { letters[k].syl = si; s.text += letters[k].ch; } });
    w.isCap = isUpper(raw[0]);
    applyLetterRules(w, LX, opts);
    applyStress(w, LX, opts);
    applyMistakes(w, LX);
    w.say = respell(w);
    w.score = scoreWord(w);
    return w;
  }

  function sylOfVowel(w, si) { const s = w.syl[si]; for (let k = s.from; k < s.to; k++) if (w.letters[k].v) return k; return -1; }

  function applyLetterRules(w, LX, opts) {
    const Ls = w.letters, N = Ls.length;
    const word = w.norm;
    const stemHit = (stems) => stems.some((st) => word.startsWith(st));
    const userInce = !!(LX.userInce && LX.userInce.some((st) => word.startsWith(st)));
    const ince = stemHit(LX.inceStems) || userInce;

    for (let i = 0; i < N; i++) {
      const L = Ls[i], c = L.n, next = Ls[i + 1] ? Ls[i + 1].n : '', prev = Ls[i - 1] ? Ls[i - 1].n : '';
      const si = L.syl, S = w.syl[si];

      /* ---- açık / kapalı e ---- */
      if (c === 'e') {
        const coda = [];
        for (let k = i + 1; k < S.to; k++) coda.push(Ls[k].n);
        const last = coda.length ? coda[coda.length - 1] : '';
        let open = coda.length > 0 && 'lmnr'.indexOf(coda[0]) >= 0;
        let exc = false;
        const uex = LX.userE && LX.userE[word];
        const ex = uex || LX.eKapaliExc[word] || (Object.keys(LX.eKapaliExc).find((k) => word.startsWith(k) && k.length >= 3) && LX.eKapaliExc[Object.keys(LX.eKapaliExc).find((k) => word.startsWith(k) && k.length >= 3)]);
        if (ex && ex.indexOf(si) >= 0 && open) { open = false; exc = true; }
        const excConf = uex ? 'hoca' : 'egilim';
        const st = sylText(w, si);
        if (exc) {
          addMark(w, { code: 'E_KAPALI_ISTISNA', layer: 'unlu', at: [i], sev: 'tip', conf: excConf, title: 'Kapalı e (istisna)', text: '"' + w.text + '" sözcüğünde "' + st + '" hecesindeki e, kural açık gerektirse de çoğu zaman kapalı söylenir.', tip: 'Çene biraz dar, dudak köşeleri yana. Hocanın söyleyişi esastır.', ref: REF.e });
        } else if (open) {
          addMark(w, { code: 'E_ACIK', layer: 'unlu', at: [i], sev: 'info', conf: 'egilim', title: 'Açık e', text: coda.length === 1 ? '"' + st + '" hecesi ' + coda[0] + ' ile bitiyor → açık e.' : '"' + st + '" hecesinde e\'den sonra ' + coda[0] + ' geliyor → açık e.', tip: 'Çene a\'ya yakın ve geniş, dil önde. Dar bırakıp i\'ye kaçırma.', ref: REF.e });
        } else {
          const why = coda.length ? '"' + st + '" hecesinde e\'den sonra ' + coda[0] + ' geliyor (l, m, n, r değil) → kapalı e.' : '"' + st + '" hecesi ünlüyle bitiyor → kapalı e.';
          addMark(w, { code: 'E_KAPALI', layer: 'unlu', at: [i], sev: 'info', conf: 'egilim', title: 'Kapalı e', text: why, tip: 'Çene biraz daha dar, dudak köşeleri yana açılır. Açık e\'ye çevirme.', ref: REF.e });
        }
        L.eType = open ? 'acik' : 'kapali';
      }

      /* ---- uzun ünlü (şapkalı) ---- */
      if (L.circ && L.v) {
        addMark(w, { code: 'UNLU_UZUN', layer: 'unlu', at: [i], sev: 'tip', title: 'Uzun ünlü (' + L.ch + ')', text: 'Şapkalı ünlü uzun söylenir; önündeki k, g, l incelir.', tip: 'Örnek: kâr, hâlâ, lâzım, hükûmet.', ref: REF.s7 });
      }

      /* ---- yan yana iki ünlü ---- */
      if (L.v && next && isVowelN(next) && !(Ls[i + 1].v === false)) {
        const syls = w.syl.map((s, k) => sylText(w, k)).join('-');
        addMark(w, { code: 'IKI_UNLU', layer: 'unlu', at: [i, i + 1], sev: 'tip', title: 'Yan yana iki ünlü', text: L.ch + Ls[i + 1].ch + ': iki ayrı hece (' + syls + ').', tip: 'Birleştirme, araya y koyma: "saat", "sat" olmasın.', ref: REF.vv });
      }

      /* ---- n ---- */
      if (c === 'n') {
        if (next === 'b' || next === 'p') {
          addMark(w, { code: 'N_M', layer: 'n', at: [i], sev: 'tip', title: 'n → m', text: 'n, ' + next + '\'den önce geldiği için m gibi söylenir.', tip: 'Dudaklar kapanır; yazıda n kalır. Örnek: sonbahar, onbeş, canbaz.', ref: REF.n });
          L.sound = 'm';
        } else if (next === 'k' || next === 'g') {
          addMark(w, { code: 'N_NG', layer: 'n', at: [i], sev: 'tip', conf: 'egilim', title: 'n → ng sesi', text: 'n, ' + next + '\'den önce damak n\'si olur ("ng" sesi).', tip: 'Dilin arkası damağa yükselir. Doğal olur; abartma. Hocanın söyleyişi esastır.', ref: REF.n });
          L.sound = 'ŋ';
        }
      }

      /* ---- kalın / ince l, k, g ---- */
      if (c === 'l' || c === 'k' || c === 'g') {
        const vi = sylOfVowel(w, si);
        let vowel = vi >= 0 ? Ls[vi] : null;
        let front = vowel ? FRONT.indexOf(vowel.n) >= 0 : false;
        let why = vowel ? vowel.ch : '';
        let exception = false;
        if (vowel && vowel.circ) { front = true; exception = true; }
        const adj = (Ls[i - 1] && Ls[i - 1].circ) || (Ls[i + 1] && Ls[i + 1].circ);
        if (adj) { front = true; exception = true; why = (Ls[i - 1] && Ls[i - 1].circ ? Ls[i - 1] : Ls[i + 1]).ch; }
        if (ince && !front && c === 'l' || (ince && !front && (c === 'k' || c === 'g') && /^(kalp|kalb|alkol)/.test(word))) { front = true; exception = true; }
        const nm = c;
        const refk = c === 'l' ? REF.l : c === 'k' ? REF.k : REF.g;
        const desc = {
          l: { b: 'dilin gövdesi geride', f: 'dil önde, ucu üst dişlerin arkasında' },
          k: { b: 'dilin arkası yumuşak damağa değer', f: 'dil önde, damağın ortasına yakın' },
          g: { b: 'dilin arkası geride', f: 'dil önde, damağın ortasına yakın' }
        }[c];
        if (front) {
          addMark(w, {
            code: nm.toUpperCase() + '_INCE', layer: 'kalin', at: [i], sev: exception ? 'tip' : 'info', title: 'İnce ' + nm + (exception ? (userInce ? ' (Hoca)' : ' (alıntı)') : ''),
            text: exception ? (adj ? 'Şapkalı ünlünün yanında ' + nm + ' ince söylenir.' : 'Alıntı sözcükte ' + nm + ', a/o/u yanında bile ince söylenir.') : nm + ', "' + why + '" ünlüsünün yanında → ince: ' + desc.f + '.',
            tip: exception ? 'Örnek: lâzım, hâlâ, kalp, alkol, rol, gol, kâr, kâğıt.' : 'Ünlü ince olduğunda ünsüz de öne gelir.', ref: refk, conf: userInce ? 'hoca' : 'kesin'
          });
          L.thin = true;
        } else if (vowel) {
          addMark(w, { code: nm.toUpperCase() + '_KALIN', layer: 'kalin', at: [i], sev: 'info', title: 'Kalın ' + nm, text: nm + ', "' + why + '" ünlüsünün yanında → kalın: ' + desc.b + '.', tip: 'Ünlü kalın olduğunda ünsüz de geride kalır.', ref: refk });
          L.thin = false;
        }
      }

      /* ---- ğ ---- */
      if (c === 'ğ') {
        const pv = Ls[i - 1] && Ls[i - 1].v ? i - 1 : -1;
        const nv = Ls[i + 1] && Ls[i + 1].v;
        let text, title = 'ğ: ünlüyü uzat';
        if (pv >= 0 && nv) text = '"' + Ls[pv].ch + '" ünlüsü uzar ve ğ, ' + Ls[i + 1].ch + ' ünlüsüne yumuşakça bağlanır.';
        else if (pv >= 0) text = '"' + Ls[pv].ch + '" ünlüsü uzar; ğ ayrı bir ses olarak duyulmaz.';
        else text = 'ğ önceki sesi yumuşatır.';
        if (/^değil/.test(word)) { text = '"değil": ğ\'yi tamamen atma ("deil", "diil" olmasın); ünlüyü hafifçe uzat.'; title = 'değil: ğ\'yi at(ma)'; }
        const at = pv >= 0 ? [pv, i] : [i];
        addMark(w, { code: 'G_UZAT', layer: 'ozel', at, sev: /^değil/.test(word) ? 'warn' : 'tip', conf: 'egilim', title, text, tip: 'ğ\'yi y, v ya da g gibi söyleme; sözcüğü kısaltma (dağa, "daa" olmasın).', ref: REF.gg });
        if (/acağ|eceğ/.test(word) && /ğ/.test(word.slice(i, i + 1)) && /(acağ|eceğ)/.test(word.slice(Math.max(0, i - 3), i + 1))) {
          addMark(w, { code: 'G_ACAG', layer: 'ozel', at: [i], sev: 'warn', title: '-acağ- / -eceğ-', text: '"' + w.text + '": ek tam söylenir ("yapıcam", "yapacam" olmasın).', tip: 'Ğ\'yi at(ma); önce yavaş, hecelerle: ya-pa-ca-ğım.', ref: REF.hata });
        }
      }

      /* ---- v ---- */
      if (c === 'v') {
        const pv = Ls[i - 1], nv = Ls[i + 1];
        if (pv && pv.v && nv && nv.v && (ROUND.indexOf(pv.n) >= 0 || ROUND.indexOf(nv.n) >= 0)) {
          addMark(w, { code: 'V_YUMUSAK', layer: 'ozel', at: [i], sev: 'info', conf: 'egilim', title: 'v yumuşar', text: 'İki ünlü arasında, yuvarlak ünlünün yanında v hafifler.', tip: 'İki dudakla (w gibi) söyleme, ama "tauk" gibi de bırakma. Üst diş alt dudağa hafifçe değsin.', ref: REF.v });
        }
        if (i === N - 1) {
          addMark(w, { code: 'V_SON', layer: 'son', at: [i], sev: 'tip', title: 'Sondaki v', text: 'Sonda v, f\'ye dönmesin.', tip: 'Örnek: ev ("ef" değil), dev, sev.', ref: REF.v });
        }
      }

      /* ---- h ---- */
      if (c === 'h') {
        let text, tip;
        if (i === 0) { text = 'Sözcük başında h net duyulsun.'; tip = 'Hafif, temiz bir nefes; hırıltılı olmasın.'; }
        else if (i === N - 1) { text = 'Sondaki h yutulmasın: ' + w.text + '.'; tip = 'Sabah, ah, günah: nefesi bitir.'; }
        else { text = 'Ortadaki h yutulmasın: ' + w.text + ' ("' + w.text.replace(/h/i, '') + '" değil).'; tip = 'Kahve, ahır, mühim: h\'yi duyur.'; }
        addMark(w, { code: 'H_NET', layer: 'ozel', at: [i], sev: i === 0 ? 'info' : 'tip', title: 'h duyulsun', text, tip, ref: REF.h });
      }

      /* ---- çift ünsüz ---- */
      if (!L.v && next === c && i + 1 < N) {
        addMark(w, { code: 'CIFT_UNSUZ', layer: 'ozel', at: [i, i + 1], sev: 'tip', title: 'Çift ünsüz', text: L.ch + Ls[i + 1].ch + ': iki ünsüz de duyulur, ünsüz hafifçe uzar.', tip: 'Örnek: anne, affetmek, hissetmek.', ref: REF.cift });
        i++; // ikinci harfi tekrar sayma
        continue;
      }
    }

    /* ---- ünsüz kümeleri ---- */
    {
      let i = 0;
      while (i < N) {
        if (!Ls[i].v) {
          let j = i;
          while (j < N && !Ls[j].v) j++;
          const len = j - i;
          const cl = w.letters.slice(i, j).map((l) => l.ch).join('');
          const isRepeat = len === 2 && Ls[i].n === Ls[i + 1].n;
          if (i === 0 && len >= 2 && !isRepeat && N > j) {
            addMark(w, { code: 'KUME_BASI', layer: 'zor', at: range(i, j), sev: 'warn', title: 'Başta ünsüz kümesi', text: '"' + cl + '" tek hecede kalır; araya ünlü ekleme.', tip: 'Örnek: tren ("tiren" değil), plan, grup, spor.', ref: REF.kume });
          } else if (len >= 3 && !isRepeat) {
            addMark(w, { code: 'KUME_UC', layer: 'zor', at: range(i, j), sev: len >= 4 ? 'warn' : 'tip', title: 'Zor ünsüz kümesi', text: '"' + cl + '": ' + len + ' ünsüz yan yana; ayırmadan, ünlü eklemeden söyle.', tip: 'Yavaştan başla: Türkçe, kırkıncı, dörtte, sürdürülebilir.', ref: REF.kume });
          } else if (j === N && len >= 2 && !isRepeat && i > 0) {
            addMark(w, { code: 'KUME_SON', layer: 'zor', at: range(i, j), sev: 'tip', title: 'Sonda ünsüz kümesi', text: '"' + cl + '" sonda birlikte söylenir; araya ünlü girmesin.', tip: 'Örnek: kırk ("kırık" değil), dört, aşk.', ref: REF.kume });
          }
          i = j;
        } else i++;
      }
    }

    /* ---- sözcük sonu ---- */
    if (N >= 2) {
      const last = Ls[N - 1];
      const lc = last.n;
      if (!last.v) {
        if (/yor(um|sun|uz|sunuz|lar|du|dum|dun|duk|dunuz|muş|sa)?$/.test(word) && /[ıiuü]yor/.test(word)) {
          // -yor eki içindeki r
          const m = word.match(/yor/);
          const ri = word.indexOf('yor') + 2;
          addMark(w, { code: 'SON_YOR', layer: 'son', at: [ri], sev: 'warn', title: '-yor: r\'yi söyle', text: '"' + w.text + '": -yor ekindeki r yutulmaz ("' + w.text.replace(/yor/, 'yo') + '" olmasın).', tip: 'Önce yavaş hecele: ge-li-yor. Sondaki ünsüzler de net.', ref: REF.r });
          if (i_isFinalAfter(word, ri) === false) { /* devam */ }
          if (ri !== N - 1) addSonConsonant(w, N - 1);
        } else addSonConsonant(w, N - 1);
      }
    }
    /* -lar / -ler çoğul eki */
    if (N >= 4 && /(lar|ler)$/.test(word) && !w.marks.some((m) => m.code === 'SON_YOR')) {
      // son r zaten addSonConsonant ile işaretlendi
    }
  }
  function i_isFinalAfter() { return true; }

  const range = (a, b) => { const r = []; for (let i = a; i < b; i++) r.push(i); return r; };

  function addSonConsonant(w, i) {
    const L = w.letters[i], c = L.n;
    let sev = 'tip', title, text, tip;
    if ('ktpç'.indexOf(c) >= 0) {
      const alt = { k: 'ğ/yok', t: 'd', p: 'b', 'ç': 'c' }[c];
      title = 'Sondaki ' + L.ch;
      const ex = { k: 'çok ("ço" değil)', t: 'süt ("süd" değil)', p: 'kitap ("kitab" değil)', 'ç': 'ağaç ("ağaş" değil)' }[c];
      text = 'Sondaki ' + L.ch + ' yutulmaz, yumuşatılmaz: ' + ex + '.';
      tip = 'Ünlüyle başlayan ek gelince yumuşar (kitabım); sözcük sonunda sert kalır.';
    } else if (c === 'z' || c === 's' || c === 'ş') {
      title = 'Sondaki ' + L.ch;
      text = c === 's' ? 'Sondaki s ötümsüz kalır: herkes ("herkez" değil).' : c === 'z' ? 'Sondaki z titreşimli kalır: göz, yüz ("gös" değil).' : 'Sondaki ş tam söylenir: baş, taş.';
      tip = 'Ötümlü-ötümsüz eşi (z-s) karıştırma.';
    } else if (c === 'n' || c === 'm') {
      title = 'Sondaki ' + L.ch;
      text = 'Sondaki ' + L.ch + ' yutulmaz: ' + (c === 'n' ? 'geliyorsun, ben, gün' : 'geldim, kalem, üzüm') + '.';
      tip = c === 'n' ? 'n ile m\'yi ekte karıştırma: geldin ≠ geldim.' : 'Dudakları kapat; son m duyulsun.';
    } else if (c === 'r' || c === 'l') {
      title = 'Sondaki ' + L.ch;
      text = 'Sondaki ' + L.ch + ' tam söylenir: ' + (c === 'r' ? 'çocuklar, bir' : 'gel, kal') + '.';
      tip = 'Sözcüğün sonunu bitir, havaya bırakma.';
      sev = 'info';
    } else if (c === 'd' || c === 'b' || c === 'c' || c === 'g') {
      title = 'Sondaki ' + L.ch; text = 'Alıntı sözcüklerde sondaki ' + L.ch + ' duyulur: psikolog ("psikolok" değil).'; tip = 'Sonu yumuşatma.';
    } else { title = 'Sondaki ' + L.ch; text = 'Sondaki ünsüz net duyulsun.'; tip = ''; sev = 'info'; }
    addMark(w, { code: 'SON_' + c.toUpperCase(), layer: 'son', at: [i], sev, title, text, tip, ref: REF.r });
  }

  /* ---- sık hatalar (kılavuz Bölüm 9) ---- */
  function applyMistakes(w, LX) {
    const word = w.norm;
    for (const m of LX.mistakes) {
      if (!m.wrong) continue;
      if (m.re.test(word)) {
        addMark(w, { code: 'HATA_SIK', layer: 'hata', at: [0], sev: 'warn', title: 'Sık yapılan hata', text: '"' + m.wrong + '" demeyin: ' + m.note + '.', tip: 'Kılavuzdaki "sık yanlış söylenen sözcükler" listesinde.', ref: REF.hata });
        break;
      }
    }
    if (/^geliyor|^yapıyor|^gidiyor|^okuyor|^bakıyor|^diyor|^biliyor|^görüyor|^veriyor/.test(word) && !w.marks.some((m) => m.code === 'SON_YOR')) { /* yor kuralı zaten */ }
  }

  /* ------------------------------------------------------------------ *
   *  7. Vurgu
   * ------------------------------------------------------------------ */
  function heavySyl(w, si) {
    const s = w.syl[si];
    // ağır hece: kapalı (ünsüzle biten) ya da uzun
    return !w.letters[s.to - 1].v;
  }
  function placeStress(w) {
    const n = w.syl.length;
    if (n === 2) return 0;
    const p = n - 2, a = n - 3;
    if (heavySyl(w, p)) return p;
    if (a >= 0 && heavySyl(w, a)) return a;
    return Math.max(0, a >= 0 ? a : p);
  }

  function setStress(w, syl, rule, conf, why) { w.stress = { syl, rule, conf, why }; }

  function applyStress(w, LX, opts) {
    const n = w.syl.length;
    const word = w.norm;
    if (!n) return;
    if (LX.userStress && LX.userStress[word] != null) {
      setStress(w, Math.min(n - 1, LX.userStress[word]), 'HOCA', 'hoca', 'Hoca modunda bu sözcük için vurgu elle belirlendi.');
      return pushStressMark(w);
    }
    if (LX.clitics.indexOf(word) >= 0) { setStress(w, -1, 'KLITIK', 'kesin', '"' + w.text + '" vurgusuzdur; vurgu önceki sözcükte kalır (Gel-di mi?).'); w.flags.clitic = true; return pushStressMark(w); }
    if (n === 1) { setStress(w, -1, 'TEK', 'kesin', 'Tek heceli sözcükte vurgu aranmaz (cümlede güç kazanabilir).'); return pushStressMark(w); }
    // sözlük
    if (LX.stress[word] != null) {
      const k = Math.min(n - 1, LX.stress[word]);
      setStress(w, k, 'SOZLUK', 'egilim', '"' + w.text + '" sözcüğünde vurgu ' + (k + 1) + '. hecede (sondan farklı sözcüklerden).');
      return pushStressMark(w);
    }
    // -ça/-çe zarfları
    if (LX.advCa.indexOf(word) >= 0 && n >= 3) {
      setStress(w, n - 2, 'ZARF', 'egilim', 'Zarf yapan -ça/-çe eki vurgusuzdur; vurgu önceki hecede.');
      return pushStressMark(w);
    }
    // olumsuzluk -ma/-me
    const neg = detectNegation(w);
    if (neg >= 1) { setStress(w, neg - 1, 'OLUMSUZ', 'egilim', 'Olumsuzluk eki -' + sylText(w, neg).toLowerCase() + ' vurgusuzdur; vurgu önceki heceye kayar.'); return pushStressMark(w); }
    // ek fiil / birleşik çekim
    const ef = detectEkFiil(w);
    if (ef >= 1) { setStress(w, ef - 1, 'EKFIIL', 'egilim', 'Ek fiil ve birleşik çekim ekleri (-di, -miş, -se) vurgusuzdur; vurgu önceki hecede.'); return pushStressMark(w); }
    // yer adı (kök sözcük; ek alınmışsa vurgu eke kayar)
    const hasApos = Object.keys(w.aposAfter).length > 0;
    if (!hasApos && LX.places.some((p) => trLower(p) === word)) {
      const k = placeStress(w);
      setStress(w, k, 'YER_ADI', 'egilim', 'Yer adlarında vurgu genellikle ilk ya da sondan önceki ağır heceye düşer; hocanın söyleyişine bakın.');
      w.flags.place = true;
      return pushStressMark(w);
    }
    if (w.isCap && !(opts && opts.sentenceStart)) w.flags.proper = true;
    setStress(w, n - 1, 'SON', 'kesin', 'Türkçede vurgu normalde son hecededir.');
    pushStressMark(w);
  }
  function pushStressMark(w) {
    const s = w.stress;
    if (s.syl < 0) {
      addMark(w, { code: 'VURGU_' + s.rule, layer: 'vurgu', at: [], sev: 'info', conf: s.conf, title: s.rule === 'KLITIK' ? 'Vurgusuz ek sözcük' : 'Tek heceli', text: s.why, tip: s.rule === 'KLITIK' ? 'Vurgu kendinden önceki ögeye taşınır.' : '', ref: REF.vurgu });
      return;
    }
    const S = w.syl[s.syl];
    addMark(w, { code: 'VURGU_' + s.rule, layer: 'vurgu', at: range(S.from, S.to), sev: s.rule === 'SON' ? 'info' : 'tip', conf: s.conf, title: 'Vurgu: ' + sylText(w, s.syl), text: s.why, tip: s.rule === 'SON' ? 'Son heceyi hafifçe öne çıkar; sesi yükseltmek yerine süreyi uzat.' : 'Sondan farklı bir kural: kulağınla da kontrol et.', ref: REF.vurgu });
  }

  /** olumsuzluk hecesinin indeksi (yoksa -1) */
  function detectNegation(w) {
    const n = w.syl.length;
    if (n < 3) return -1;
    const tails = /^(dı|di|du|dü|tı|ti|tu|tü|yor|yacak|yecek|yaca|yece|yaca[ğk]|mış|miş|muş|müş|sa|se|yan|yen|z|zsın|zsin|zsun|zsün|zsınız|zsiniz|yız|yiz|yuz|yüz|k|n|nız|niz|nuz|nüz|malı|meli|mak|mek|yın|yin|yun|yün|yınız|yiniz|yalım|yelim|dır|dir|dur|dür|sın|sin|sun|sün|lar|ler|ya|ye|yası|yeni)/;
    for (let k = 1; k < n - 0; k++) {
      const t = sylText(w, k).toLowerCase().replace(/İ/g, 'i');
      const tl = trLower(t);
      if ((tl === 'ma' || tl === 'me' || tl === 'mı' && false) && k >= 1) {
        const rest = w.syl.slice(k + 1).map((s, q) => sylText(w, k + 1 + q)).join('');
        const restN = trLower(rest);
        if (restN && /^(dı|di|du|dü|tı|ti|tu|tü|yor|yacak|yecek|yacağ|yeceğ|mış|miş|muş|müş|sa|se|yan|yen|z|malı|meli|yın|yin|yalım|yelim|dır|dir|sın|sin|ya|ye|yı|yi|mak|mek)/.test(restN)) return k;
      }
    }
    return -1;
  }
  function detectEkFiil(w) {
    const n = w.syl.length;
    if (n < 3) return -1;
    const word = w.norm;
    // geniş zaman / -yor / -acak + ek fiil
    const m = word.match(/(r|yor|yacak|yecek|ecek|acak|[ae]cağ|mış|miş|muş|müş)(dı|di|du|dü|mış|miş|muş|müş|sa|se)(m|n|k|nız|niz|nuz|nüz|lar|ler|ım|im|um|üm|sın|sin|sun|sün)?$/);
    if (!m) return -1;
    const efStart = word.length - (m[2].length + (m[3] ? m[3].length : 0));
    // ek fiilin ilk harfinin hecesi
    let si = -1, cnt = 0;
    for (let k = 0; k < n; k++) { const S = w.syl[k]; if (S.from <= efStart && efStart < S.to) { si = k; break; } }
    if (si >= 1 && w.letters[w.syl[si].from].n === word[efStart]) {
      if (m[1] === 'r' && w.syl[si - 1].to - w.syl[si - 1].from < 2) return -1;
      if (m[1] === 'r' && word.length - m[0].length < 2) return -1;
      return si;
    }
    return -1;
  }

  /* ------------------------------------------------------------------ *
   *  8. Söyleniş yazımı (sözcük laboratuvarı için)
   * ------------------------------------------------------------------ */
  function respell(w) {
    const parts = [];
    for (let si = 0; si < w.syl.length; si++) {
      const S = w.syl[si];
      let s = '';
      for (let k = S.from; k < S.to; k++) {
        const L = w.letters[k];
        let ch = L.n;
        if (L.sound) ch = L.sound;
        else if (L.eType === 'acik') ch = 'ɛ';
        else if (ch === 'ğ') {
          if (s) s += 'ː'; else if (parts.length && parts[parts.length - 1].slice(-1) !== 'ː') parts[parts.length - 1] += 'ː';
          continue;
        }
        if (L.circ && L.v) ch += 'ː';
        s += ch;
      }
      if (s) parts.push(s);
    }
    return parts.join('·');
  }

  /* ------------------------------------------------------------------ *
   *  9. Zorluk puanı
   * ------------------------------------------------------------------ */
  function scoreWord(w) {
    let s = 0;
    s += Math.max(0, w.syl.length - 2) * 0.55;
    for (const m of w.marks) {
      if (m.layer === 'zor') s += m.code === 'KUME_UC' ? 1.5 : m.code === 'KUME_BASI' ? 1.2 : 0.8;
      else if (m.sev === 'warn') s += 1.1;
      else if (m.code === 'N_M' || m.code === 'N_NG') s += 0.5;
      else if (m.code === 'G_UZAT') s += 0.5;
      else if (m.code === 'IKI_UNLU') s += 0.6;
      else if (m.code === 'CIFT_UNSUZ') s += 0.5;
      else if (m.code === 'V_YUMUSAK') s += 0.3;
      else if (m.code === 'UNLU_UZUN') s += 0.6;
      else if (m.code.indexOf('_INCE') > 0 && m.sev === 'tip') s += 0.7;
    }
    const hasA = w.marks.some((m) => m.code === 'E_ACIK'), hasK = w.marks.some((m) => m.code === 'E_KAPALI');
    if (hasA && hasK) s += 0.6;
    if (/[jğ]/.test(w.norm)) s += 0.3;
    return +s.toFixed(2);
  }

  /* ------------------------------------------------------------------ *
   *  10. Cümle ve metin çözümleme
   * ------------------------------------------------------------------ */
  const TERMINAL = { '.': 1, '?': 1, '!': 1, '…': 1, '?!': 1 };
  const PAUSE = {
    ',': { name: 'virgül', durak: true, soluk: false, ms: 260 },
    ';': { name: 'noktalı virgül', durak: true, soluk: 'mumkun', ms: 480 },
    ':': { name: 'iki nokta', durak: true, soluk: 'mumkun', ms: 480 },
    '—': { name: 'tire', durak: true, soluk: false, ms: 320 },
    '.': { name: 'nokta', durak: true, soluk: true, ms: 900 },
    '?': { name: 'soru işareti', durak: true, soluk: true, ms: 900 },
    '!': { name: 'ünlem', durak: true, soluk: true, ms: 900 },
    '?!': { name: 'soru-ünlem', durak: true, soluk: true, ms: 900 },
    '…': { name: 'üç nokta', durak: true, soluk: true, ms: 1000 }
  };

  function splitSentences(tokens) {
    const sents = [];
    let cur = { items: [], para: 0 };
    let para = 0;
    const flush = () => { if (cur.items.some((x) => x.type === 'word')) { cur.para = cur.para; sents.push(cur); } else if (cur.items.length) { /* sadece noktalama: önceki cümleye ekle */ if (sents.length) sents[sents.length - 1].items.push(...cur.items); } cur = { items: [], para }; };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'nl') {
        flush();
        if (t.count >= 2) para++;
        cur.para = para;
        cur.newPara = t.count >= 2;
        continue;
      }
      cur.items.push(t);
      if (t.type === 'punct' && TERMINAL[t.ch]) {
        // kısaltma gibi tek harf + nokta ise bölme
        const prev = cur.items[cur.items.length - 2];
        // kapanış tırnak/parantezleri bu cümleye kat
        let j = i + 1;
        while (j < tokens.length && (tokens[j].type === 'quote' && !tokens[j].open || tokens[j].type === 'paren' && !tokens[j].open)) { cur.items.push(tokens[j]); j++; }
        const nxt = tokens[j];
        i = j - 1;
        if (t.ch === '.' && nxt && nxt.type === 'word' && prev && prev.type === 'word' && prev.text.length === 1 && trLower(nxt.text[0]) === nxt.text[0]) continue;
        if ((t.ch === '?' || t.ch === '!' || t.ch === '?!') && nxt && nxt.type === 'word' && trLower(nxt.text[0]) === nxt.text[0] && nxt.text[0] !== nxt.text[0].toUpperCase()) continue;
        const np = cur.newPara; const pr = cur.para;
        flush();
      }
    }
    flush();
    return sents;
  }

  function analyze(text, opts) {
    opts = opts || {};
    const LX = mergeLexicon(opts.user);
    const o = { lex: LX, stressOverride: opts.stressOverride || null };
    const tokens = tokenize(String(text || '').slice(0, opts.maxChars || 40000));
    const rawSents = splitSentences(tokens);
    const A = { text, sentences: [], words: [], stats: {}, opts };
    let wi = 0;
    let lastPara = -1;
    rawSents.forEach((rs, si) => {
      const S = { id: 's' + si, index: si, para: rs.para, items: [], words: [], kind: 'bildirme', kindAuto: 'bildirme', paraStart: rs.para !== lastPara, opts: {} };
      lastPara = rs.para;
      let pendingOpen = [];
      let first = true;
      for (let ti = 0; ti < rs.items.length; ti++) {
        const t = rs.items[ti];
        if (t.type === 'word') {
          const w = buildWord(t.text, { lex: LX, stressOverride: o.stressOverride, sentenceStart: first });
          w.group = t.group; w.id = 'w' + wi; w.gi = wi; w.si = S.words.length; w.sentence = S; w.pre = pendingOpen; pendingOpen = [];
          w.post = []; w.glue = rs.items[ti - 1] && rs.items[ti - 1].type === 'glue';
          w.upperOrig = !!t.upperOrig;
          wi++;
          S.words.push(w); A.words.push(w); S.items.push({ t: 'w', w });
          first = false;
        } else if (t.type === 'punct') {
          const last = S.words[S.words.length - 1];
          const p = { t: 'p', ch: t.ch, pause: PAUSE[t.ch] || PAUSE[','] };
          if (last) last.post.push(p);
          S.items.push(p);
        } else if (t.type === 'quote' || t.type === 'paren') {
          if (t.open) pendingOpen.push({ t: 'q', ch: t.ch, open: true, paren: t.type === 'paren' });
          else { const last = S.words[S.words.length - 1]; const q = { t: 'q', ch: t.ch, open: false, paren: t.type === 'paren' }; if (last) last.post.push(q); }
        } else if (t.type === 'glue') {
          S.items.push({ t: 'g' });
        }
      }
      if (S.words.length) A.sentences.push(S);
    });
    // tırnak sonrasında açık kalan tırnaklar
    A.sentences.forEach((S) => analyzeSentence(S, A, LX, opts));
    analyzeLinks(A);
    A.stats = textStats(A);
    return A;
  }

  /* ---- cümle düzeyi ---- */
  function analyzeSentence(S, A, LX, opts) {
    const words = S.words;
    if (!words.length) return;
    const lastWord = words[words.length - 1];
    const term = (() => { for (let k = lastWord.post.length - 1; k >= 0; k--) if (lastWord.post[k].t === 'p') return lastWord.post[k].ch; return ''; })();
    S.term = term;
    // soru ekleri
    const hasMi = words.some((w) => /^m[ıiuü](y?)(sın|sin|sun|sün|sınız|siniz|sunuz|sünüz|ım|im|um|üm|ız|iz|uz|üz|dır|dir|dur|dür|ydı|ydi|ydu|ydü|ymış|ymiş)?$/.test(w.norm) && w.norm.length <= 7 && w.si > 0);
    const hasWh = words.some((w) => LX.whWords.indexOf(w.norm) >= 0);
    S.hasMi = hasMi; S.hasWh = hasWh;
    let kind = 'bildirme';
    if (term === '?' || term === '?!') kind = 'soru';
    else if (term === '!') {
      const lw = lastWord.norm;
      const exclStart = /^(ne|nasıl|çok|öyle|böyle|kaç|vay|aman|yaşasın|harika|bravo|eyvah)$/.test(words[0].norm) || words.some((w, q) => q < words.length - 1 && w.norm === 'ne' && words[q + 1].norm === 'kadar');
      const imper = !exclStart && (LX.imperStart.indexOf(words[0].norm) >= 0 || (lw.length >= 5 && /(ın|in|un|ün|ınız|iniz|unuz|ünüz)$/.test(lw)) || /(sın|sin|sun|sün)$/.test(lw) && lw.length >= 5 || (words.length <= 2 && !/[aeıioöuü]$/.test(lw) && lw.length <= 4 && !exclStart));
      kind = imper ? 'emir' : 'unlem';
    } else if (term === '…') kind = 'askida';
    S.kind = S.kindAuto = kind;

    // vurgu odağı: yükleme (son sözcük) yakın öge; "de/mi" önceki sözcüğe taşır
    S.focus = pickFocus(S, LX);

    // zincirlenmiş yapılar: durak ve soluk planı
    S.phrases = buildPhrases(S, A, LX, opts);
    S.stats = { words: words.length, syl: words.reduce((a, w) => a + w.syl.length, 0) };
    const letters = words.map((w) => w.norm[0]);
    // tekerleme / ses yoğunluğu
    const freq = {};
    letters.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
    let top = 0, topC = '';
    for (const c in freq) if (freq[c] > top) { top = freq[c]; topC = c; }
    S.alliteration = (words.length >= 4 && top >= 3 && top / words.length >= 0.4) ? { letter: topC, count: top } : null;
    // zorluk
    const sc = words.reduce((a, w) => a + w.score, 0);
    S.score = +(sc / Math.max(1, words.length)).toFixed(2);
  }

  function pickFocus(S, LX) {
    const words = S.words;
    if (words.length === 1) return { wi: 0, why: 'Tek sözcük' };
    // yüklem: son sözcük (sondaki ünlem/soru ekleri hariç)
    let predIdx = words.length - 1;
    while (predIdx > 0 && LX.clitics.indexOf(words[predIdx].norm) >= 0) predIdx--;
    // yükleme en yakın (önceki) öge
    let k = predIdx - 1;
    while (k >= 0 && (LX.clitics.indexOf(words[k].norm) >= 0 || (words[k].norm.length <= 2 && !isVowelN(words[k].norm[0]) && words[k].syl.length === 1 && LX.breathWords.indexOf(words[k].norm) >= 0))) k--;
    if (k < 0) return { wi: predIdx, why: 'Yüklem başta; yüklem vurgulanır.' };
    // soru eki: kendinden önceki ögede vurgu
    if (S.hasMi) {
      const miIdx = words.findIndex((w, q) => q > 0 && /^m[ıiuü]/.test(w.norm) && LX.clitics.indexOf(w.norm) >= 0);
      if (miIdx > 0) return { wi: miIdx - 1, why: 'Soru eki "' + words[miIdx].text + '" vurguyu kendinden önceki sözcüğe taşır.' };
    }
    if (S.hasWh) {
      const wh = words.findIndex((w) => LX.whWords.indexOf(w.norm) >= 0);
      if (wh >= 0) return { wi: wh, why: 'Soru sözcüğü vurgu alır.' };
    }
    return { wi: k, why: 'Yükleme en yakın öge öne çıkar.' };
  }

  /** cümleyi duraklara (ifade bloklarına) ayırır ve soluk noktalarını planlar */
  function buildPhrases(S, A, LX, opts) {
    const cap = (opts && opts.breathCapacity) || 22; // bir soluktaki hece
    const phrases = [];
    let cur = { from: 0, to: -1, syl: 0, end: null };
    const words = S.words;
    words.forEach((w, i) => {
      cur.syl += w.syl.length;
      cur.to = i;
      // açılış tırnağı ve parantez: önünde durak
      const lastP = w.post.filter((p) => p.t === 'p').pop();
      const closeQ = w.post.filter((p) => p.t === 'q' && !p.open);
      const next = words[i + 1];
      let brk = null;
      if (lastP) brk = { kind: lastP.ch, ...lastP.pause };
      if (!lastP && closeQ.length) brk = { kind: closeQ[0].paren ? ')' : '”', name: closeQ[0].paren ? 'parantez kapanışı' : 'tırnak kapanışı', durak: true, soluk: closeQ[0].paren ? false : true, ms: closeQ[0].paren ? 220 : 520 };
      if (next && next.pre && next.pre.length && !brk) { const q = next.pre[0]; brk = { kind: q.paren ? '(' : '“', name: q.paren ? 'parantez açılışı' : 'tırnak açılışı', durak: true, soluk: q.paren ? false : true, ms: q.paren ? 220 : 520 }; }
      if (next && next.glue) brk = null;
      if (brk || i === words.length - 1) {
        cur.end = brk || { kind: '.', name: 'cümle sonu', durak: true, soluk: true, ms: 900 };
        phrases.push(cur);
        cur = { from: i + 1, to: -1, syl: 0, end: null };
      }
    });
    // soluk önerileri: soluk almadan geçen hece sayısı kapasiteyi aşarsa
    let since = 0;
    for (let p = 0; p < phrases.length; p++) {
      const ph = phrases[p];
      ph.sylBefore = since;
      since += ph.syl;
      if (ph.end && (ph.end.soluk === true)) since = 0;
      // tek bir ifade kapasiteyi aşıyorsa içine öneri koy
      ph.suggest = null;
      if (ph.syl > cap) {
        // en uygun nokta: bağlaçtan önce, ifadenin ortasına yakın
        const mid = ph.from + (ph.to - ph.from) / 2;
        let best = -1, bd = 1e9;
        for (let i = ph.from + 1; i <= ph.to; i++) {
          const wd = words[i];
          if (LX.breathWords.indexOf(wd.norm) >= 0 || LX.intro.indexOf(wd.norm) >= 0) {
            const d = Math.abs(i - mid);
            if (d < bd) { bd = d; best = i; }
          }
        }
        if (best < 0 && ph.to - ph.from >= 3) best = Math.round(mid);
        if (best >= 0) ph.suggest = { before: best, why: 'Bu ifade ' + ph.syl + ' hece; araya kısa durak koyabilirsin.' };
      }
      // soluk gereken noktalar: cümle sonu / soru-cevap vs.
    }
    // toplam soluk önerisi: sentence düzeyinde (soluksuz geçen hece > cap)
    S.breathAlerts = [];
    let run = 0;
    phrases.forEach((ph, pi) => {
      run += ph.syl;
      if (run > cap && !(ph.end && ph.end.soluk === true)) {
        S.breathAlerts.push({ phrase: pi, run, why: 'Soluk almadan ' + run + ' hece geçiyor; ilk uygun durakta soluk al.' });
      }
      if (ph.end && ph.end.soluk === true) run = 0;
      else if (ph.end && ph.end.soluk === 'mumkun') { /* soluk mümkün: yük sıfırlanmaz ama alt eşik */ run = Math.max(0, run - Math.round(cap * 0.35)); }
    });
    return phrases;
  }

  /* ---- sözcükler arası bağlar: ulama, n+b ---- */
  function analyzeLinks(A) {
    for (const S of A.sentences) {
      const ws = S.words;
      for (let i = 0; i < ws.length - 1; i++) {
        const a = ws[i], b = ws[i + 1];
        if (a.post.some((p) => p.t === 'p' || (p.t === 'q'))) continue;
        if (b.pre && b.pre.length) continue;
        if (b.glue) continue;
        const la = a.letters[a.letters.length - 1], fb = b.letters[0];
        if (!la || !fb) continue;
        // ulama: ünsüzle biten + ünlüyle başlayan
        if (!la.v && fb.v) {
          const voiced = { p: 'b', 'ç': 'c', t: 'd', k: 'k' }[la.n];
          let sp = la.ch;
          if (la.n === 'p') sp = 'b';
          const spoken = (a.syl[a.syl.length - 1] ? sylText(a, a.syl.length - 1) : '') + ' + ' + b.text;
          const m1 = addMark(a, { code: 'ULAMA', layer: 'bag', at: [a.letters.length - 1], sev: 'tip', title: 'Ulama', text: '"' + a.text + ' ' + b.text + '": ' + a.text + ' sözcüğünün son ünsüzü ' + b.text + ' sözcüğünün ünlüsüne bağlanır' + (la.n === 'p' ? ' (p, b gibi bağlanır)' : '') + '.', tip: 'Araya durak koyma; akışı sürdür. Her sözcükten sonra durmak kesik kesik konuşma yaratır.', ref: REF.ulama });
          m1.link = { to: b.id }; m1.cross = true;
          const m2 = addMark(b, { code: 'ULAMA_ALAN', layer: 'bag', at: [0], sev: 'info', title: 'Ulama (alan)', text: 'Önceki sözcüğün sonu bu sözcüğün ilk ünlüsüne bağlanır.', tip: '', ref: REF.ulama });
          m2.link = { from: a.id }; m2.cross = true;
          a.linkNext = { to: b, kind: 'ulama', voiced: la.n === 'p' };
        }
        // n + b/p (sözcükler arası)
        if (la.n === 'n' && (fb.n === 'b' || fb.n === 'p')) {
          const m = addMark(a, { code: 'N_M_SINIR', layer: 'n', at: [a.letters.length - 1], sev: 'info', conf: 'egilim', title: 'n → m (sözcükler arası)', text: '"' + a.text + ' ' + b.text + '": akıcı konuşmada n, ' + fb.ch + '\'den önce m\'ye kayabilir.', tip: 'Ulama yaptığında doğal olarak olur; zorlama.', ref: REF.n });
          m.link = { to: b.id }; m.cross = true;
        }
      }
      // y kaynaştırma (ünlüyle biten kök + yı/yi/ya/ye ...) — yalnız belirgin kalıplar
      for (const w of ws) {
        const m = w.norm.match(/^(.{2,}[aeıioöuü])(y)(ı|i|u|ü|a|e|la|le|ım|im|dı|di|du|dü)$/);
        if (m && w.letters.length >= 5 && !/^(ayı|koyu|uyu|siyah)/.test(w.norm)) {
          const yi = m[1].length;
          addMark(w, { code: 'KAYNASTIRMA', layer: 'bag', at: [yi], sev: 'info', conf: 'egilim', title: 'Kaynaştırma ünsüzü', text: 'Ünlüyle biten sözcüğe ek gelirken araya giren y net duyulsun: ' + w.text + '.', tip: 'Örnek: kapı-y-ı, masa-y-ı, araba-y-la.', ref: REF.ulama });
        }
      }
    }
  }

  /* ---- metin istatistikleri ---- */
  function textStats(A) {
    const st = { sentences: A.sentences.length, words: A.words.length, syl: 0, paragraphs: 0, marks: {}, warn: 0, tip: 0, byLayer: {}, hard: [], longest: 0 };
    let lastP = -1;
    for (const S of A.sentences) {
      if (S.para !== lastP) { st.paragraphs++; lastP = S.para; }
      st.syl += S.stats.syl;
      for (const w of S.words) {
        for (const m of w.marks) {
          st.marks[m.code] = (st.marks[m.code] || 0) + 1;
          st.byLayer[m.layer] = (st.byLayer[m.layer] || 0) + 1;
          if (m.sev === 'warn') st.warn++;
          else if (m.sev === 'tip') st.tip++;
        }
      }
    }
    st.hard = A.words.map((w) => w).sort((a, b) => b.score - a.score).filter((w) => w.score >= 1.5).slice(0, 12);
    return st;
  }

  /* ------------------------------------------------------------------ *
   *  11. Zaman çizelgesi (karaoke) ve ton eğrisi
   * ------------------------------------------------------------------ */
  const TEMPOS = { yavas: { name: 'Yavaş', sps: 3.1 }, normal: { name: 'Normal', sps: 4.7 }, hizli: { name: 'Hızlı', sps: 6.4 } };

  /** her hece için süre ve perde hesaplar; olay listesi döndürür */
  function buildTimeline(A, cfg) {
    cfg = cfg || {};
    const sps = cfg.sps || TEMPOS.normal.sps;
    const base = 1000 / sps; // ms / hece
    const pauseScale = cfg.pauseScale == null ? Math.max(0.6, Math.min(1.5, 4.7 / sps)) : cfg.pauseScale;
    const ev = [];
    let t = 0;
    const sylEvents = []; // [word.gi][sylIdx] -> event
    A.sentences.forEach((S, si) => {
      if (S.paraStart && si > 0) { ev.push({ type: 'pause', t0: t, t1: t + 1100 * pauseScale, kind: 'paragraf', soluk: true, si }); t += 1100 * pauseScale; }
      const nWords = S.words.length;
      S.words.forEach((w, wi) => {
        if (w.pre && w.pre.some((q) => !q.paren)) { const d = 380 * pauseScale; ev.push({ type: 'pause', t0: t, t1: t + d, kind: 'tırnak', soluk: true, si, wi: w.gi }); t += d; }
        const isFocus = S.focus && S.focus.wi === wi;
        w.syl.forEach((sy, k) => {
          let d = base;
          if (w.stress.syl === k) d *= 1.18;
          if (isFocus && (w.stress.syl === k || (w.syl.length === 1))) d *= 1.2;
          // ğ'dan önceki ünlü uzun
          const ve = sylOfVowel(w, k);
          if (ve >= 0 && w.letters[ve + 1] && w.letters[ve + 1].n === 'ğ') d *= 1.3;
          if (ve >= 0 && w.letters[ve].circ) d *= 1.25;
          // ifade sonu uzaması
          if (k === w.syl.length - 1 && w.post.some((p) => p.t === 'p')) d *= 1.22;
          const e = { type: 'syl', t0: t, t1: t + d, si, wi: w.gi, k, w, sy };
          ev.push(e);
          (sylEvents[w.gi] = sylEvents[w.gi] || [])[k] = e;
          t += d;
        });
        // noktalama durakları
        const ps = w.post.filter((p) => p.t === 'p');
        const qs = w.post.filter((p) => p.t === 'q');
        if (ps.length) {
          const p = ps[ps.length - 1];
          const d = p.pause.ms * pauseScale;
          const isLastOfS = wi === nWords - 1;
          ev.push({ type: 'pause', t0: t, t1: t + d, kind: p.ch, soluk: p.pause.soluk, si, wi: w.gi, last: isLastOfS });
          t += d;
        } else if (qs.length && !qs[0].paren) {
          const d = 380 * pauseScale; ev.push({ type: 'pause', t0: t, t1: t + d, kind: 'tırnak', soluk: true, si, wi: w.gi }); t += d;
        } else if (w.linkNext && w.linkNext.kind === 'ulama') {
          /* ulama: araya durak yok, hafif hızlanma */
        }
      });
    });
    return { events: ev, total: t, sylEvents, sps, base };
  }

  /** cümledeki her hecenin perdesi (−1..+1) — ton eğrisi çizimi için */
  function pitchPlan(S) {
    const pts = [];
    const words = S.words;
    const total = words.reduce((a, w) => a + w.syl.length, 0) || 1;
    let n = 0;
    const kind = S.kind;
    const focusWi = S.focus ? S.focus.wi : -1;
    let phraseStartBase = 0.25;
    S.phrases.forEach((ph, pi) => {
      const phSyl = Math.max(1, ph.syl);
      let q = 0;
      for (let i = ph.from; i <= ph.to; i++) {
        const w = words[i];
        w.syl.forEach((sy, k) => {
          const progress = n / total;
          let p = phraseStartBase - 0.35 * (q / phSyl) - 0.22 * progress; // bildirgede alçalan eğilim
          if (w.stress.syl === k) p += 0.28;
          else if (w.stress.syl < 0 && w.syl.length === 1 && !w.flags.clitic) p += 0.08;
          if (i === focusWi && (w.stress.syl === k || w.syl.length === 1)) p += 0.38;
          if (w.flags.clitic) p -= 0.15;
          pts.push({ w, k, wi: i, p, last: i === ph.to && k === w.syl.length - 1, ph: pi });
          n++; q++;
        });
      }
      const endK = ph.end && ph.end.kind;
      const lastIdx = pts.length - 1;
      const lastLast = pts.slice(-2);
      if (pi === S.phrases.length - 1) {
        if (kind === 'soru') {
          if (S.hasMi) {
            const miIdx = words.findIndex((w, i) => /^m[ıiuü]/.test(w.norm) && w.flags.clitic && i > 0);
            pts.forEach((x) => { if (x.wi === miIdx - 1 && x.w.stress.syl === x.k) x.p += 0.55; });
            if (pts[lastIdx]) pts[lastIdx].p = Math.min(pts[lastIdx].p, 0.0) - 0.05;
          } else if (S.hasWh) {
            const whi = words.findIndex((w) => LEX.whWords.indexOf(w.norm) >= 0);
            pts.forEach((x) => { if (x.wi === whi && (x.w.stress.syl === x.k || x.w.syl.length === 1)) x.p += 0.5; });
            if (pts[lastIdx]) pts[lastIdx].p -= 0.2;
          } else { lastLast.forEach((x, i) => { x.p += 0.35 + 0.35 * i; }); }
        } else if (kind === 'emir') {
          if (pts.length) pts[Math.max(0, pts.length - 1)].p -= 0.35;
          if (pts[lastIdx - 1]) pts[lastIdx - 1].p += 0.1;
        } else if (kind === 'unlem') {
          lastLast.forEach((x, i) => { x.p += 0.25 + 0.2 * i; });
        } else if (kind === 'askida') {
          if (pts[lastIdx]) pts[lastIdx].p -= 0.1;
        } else { // bildirme
          if (pts[lastIdx]) pts[lastIdx].p -= 0.4;
          if (pts[lastIdx - 1]) pts[lastIdx - 1].p -= 0.12;
        }
      } else {
        const x = pts[lastIdx];
        if (x) {
          if (endK === ',') x.p += 0.2;        // devam yükselişi
          else if (endK === ';' || endK === ':') x.p += 0.1;
          else if (endK === '—') x.p += 0.05;
        }
      }
      phraseStartBase = Math.max(-0.1, phraseStartBase - 0.12);
    });
    return pts;
  }

  /* ------------------------------------------------------------------ *
   *  12. Dışa aktarma: kılavuzdaki işaretlerle metin
   * ------------------------------------------------------------------ */
  function exportMarked(A) {
    // "/" kısa durak, "//" durak ve soluk, _altı çizili_ vurgu odağı, "‿" ulama
    const out = [];
    A.sentences.forEach((S, si) => {
      if (S.paraStart && si > 0) out.push('\n');
      const parts = [];
      S.words.forEach((w, i) => {
        let t = (w.pre || []).map((q) => q.ch).join('') + w.text;
        if (S.focus && S.focus.wi === i) t = '_' + t + '_';
        const closeQ = w.post.filter((p) => p.t === 'q').map((p) => p.ch).join('');
        const p = w.post.filter((x) => x.t === 'p').pop();
        t += closeQ;
        if (p) {
          t += p.ch;
          if (p.ch === ',' || p.ch === '—') t += ' /';
          else if (p.pause && p.pause.soluk) t += ' //';
          else t += ' /';
        }
        const next = S.words[i + 1];
        const joinNext = w.linkNext && w.linkNext.kind === 'ulama' && !p;
        parts.push(t + (joinNext ? '‿' : ' '));
      });
      out.push(parts.join('').replace(/‿ /g, '‿').trim());
    });
    return out.join(' ').replace(/ \n /g, '\n\n').trim();
  }

  /* ------------------------------------------------------------------ *
   *  13. Dışa açılan API
   * ------------------------------------------------------------------ */
  function analyzeWordSolo(text, opts) { return buildWord(text, Object.assign({ lex: LEX }, opts || {})); }

  return {
    version: '1.0',
    LEX, TEMPOS, PAUSE, REF, VOWELS, LETTER_NAMES,
    trLower, trUpper, cap, baseOf, isVowelN,
    numToWords, readNumber, tokenize, syllabify, splitSentences,
    buildWord: analyzeWordSolo, analyze, buildTimeline, pitchPlan, exportMarked, mergeLexicon, scoreWord, sylText, sylOfVowel
  };
});
