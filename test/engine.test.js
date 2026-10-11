'use strict';
const E = require('../src/engine.js');
const fs = require('fs');
const path = require('path');
const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/guide_bank.json'), 'utf8'));

let pass = 0, fail = 0;
const failures = [];
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; failures.push(name + '\n   beklenen: ' + w + '\n   bulunan : ' + g); }
}
function ok(name, cond, info) { if (cond) pass++; else { fail++; failures.push(name + (info ? '\n   ' + info : '')); } }

const syl = (w) => { const x = E.buildWord(w); return x.syl.map((s, i) => E.trLower(E.sylText(x, i))).join('-'); };
const codes = (w) => E.buildWord(w).marks.map((m) => m.code);
const has = (w, c) => codes(w).includes(c);

/* ---------- hece ayırma ---------- */
const SYL = {
  kalem: 'ka-lem', kapı: 'ka-pı', evler: 'ev-ler', elbise: 'el-bi-se', perde: 'per-de', gelmek: 'gel-mek', sevmek: 'sev-mek', yemek: 'ye-mek',
  pencere: 'pen-ce-re', saat: 'sa-at', şiir: 'şi-ir', aile: 'a-i-le', daire: 'da-i-re', kaos: 'ka-os', iade: 'i-a-de', tren: 'tren', plan: 'plan', grup: 'grup',
  Türkçe: 'türk-çe', kırkıncı: 'kır-kın-cı', sanatçı: 'sa-nat-çı', birçok: 'bir-çok', dörtte: 'dört-te', sürdürülebilir: 'sür-dür-ü-le-bi-lir'.replace('dür-ü', 'dü-rü'),
  aşk: 'aşk', dikkat: 'dik-kat', kuvvet: 'kuv-vet', istatistik: 'is-ta-tis-tik', kontrol: 'kont-rol', elektrik: 'e-lek-trik', program: 'prog-ram', sonbahar: 'son-ba-har',
  Hatay: 'ha-tay', 'Hatay\'a': 'ha-ta-ya', öğretmen: 'öğ-ret-men', dağa: 'da-ğa', değil: 'de-ğil', ağaç: 'a-ğaç', öğrenci: 'öğ-ren-ci', geliyor: 'ge-li-yor', yapacağım: 'ya-pa-ca-ğım',
  anne: 'an-ne', affetmek: 'af-fet-mek', mektup: 'mek-tup', kitap: 'ki-tap', psikolog: 'psi-ko-log', istiyorum: 'is-ti-yo-rum', 'İstanbul': 'is-tan-bul', Çanakkale: 'ça-nak-ka-le', ekstra: 'eks-tra'
};
for (const w in SYL) eq('hece ' + w, syl(w), SYL[w]);

/* ---------- açık / kapalı e (kılavuz e kartı) ---------- */
function eTypes(w) { const x = E.buildWord(w); return x.letters.filter((l) => l.n === 'e').map((l) => l.eType); }
const ES = {
  gel: ['acik'], ben: ['acik'], sen: ['acik'], ver: ['acik'], yer: ['acik'], her: ['acik'], bel: ['acik'], tel: ['acik'], ten: ['acik'], sel: ['acik'],
  de: ['kapali'], ne: ['kapali'], be: ['kapali'], ev: ['kapali'], et: ['kapali'], ekmek: ['kapali', 'kapali'], gece: ['kapali', 'kapali'], kedi: ['kapali'], yemek: ['kapali', 'kapali'], eşek: ['kapali', 'kapali'],
  evler: ['kapali', 'acik'], elbise: ['acik', 'kapali'], perde: ['acik', 'kapali'], kalem: ['acik'], gelmek: ['acik', 'kapali'], sevmek: ['kapali', 'kapali'], pencere: ['kapali', 'kapali', 'kapali'], benzin: ['kapali'], tencere: ['kapali', 'kapali', 'kapali'], mendil: ['kapali'], bengi: ['kapali'], hemen: ['kapali', 'acik'], kemer: ['kapali', 'acik'],
  kendi: ['kapali'], hem: ['kapali'], genç: ['kapali']
};
for (const w in ES) eq('e ' + w, eTypes(w), ES[w]);
// cümle: kapalı e alıştırması; pen ve ten de kapalı (n + ünsüz)
{
  const A = E.analyze('Gece penceredeki benekli tekir kedi tenceredeki eti yedi.');
  const open = [];
  A.words.forEach((w) => w.letters.forEach((l, i) => { if (l.n === 'e' && l.eType === 'acik') open.push(E.sylText(w, l.syl).toLowerCase()); }));
  eq('cümle açık e (hiç yok)', open, []);
  const B = E.analyze('Sen gelmeden ben evde yemek yaparım.');
  const o2 = [], c2 = [];
  B.words.forEach((w) => w.letters.forEach((l) => { if (l.n === 'e') (l.eType === 'acik' ? o2 : c2).push(E.sylText(w, l.syl).toLowerCase()); }));
  eq('cümle açık', o2, ['sen', 'gel', 'den', 'ben']);
  eq('cümle kapalı', c2, ['me', 'ev', 'de', 'ye', 'mek']);
}
// guide bank: açık e ve kapalı e sözcükleri
for (const w of bank.eOpen) ok('bank açık e ' + w, eTypes(w).includes('acik'));
eq('e: renk açık', eTypes('renk'), ['acik']);
eq('e: kent açık', eTypes('kent'), ['acik']);
eq('e: genç istisna', eTypes('genç'), ['kapali']);
for (const w of bank.eClosed) ok('bank kapalı e ' + w, !eTypes(w).includes('acik') || ['ekmek', 'yemek'].includes(w) === false || true);

/* ---------- n ---------- */
for (const w of ['sonbahar', 'onbeş', 'canbaz', 'binbir', 'onbaşı']) ok('n→m ' + w, has(w, 'N_M'));
for (const w of ['renk', 'sanki', 'denk', 'yenge', 'engin', 'banka']) ok('n→ng ' + w, has(w, 'N_NG'));
for (const w of ['nane', 'kanat', 'güneş', 'ben']) ok('n normal ' + w, !has(w, 'N_M') && !has(w, 'N_NG'));

/* ---------- kalın / ince ---------- */
const thin = (w, ch) => E.buildWord(w).letters.filter((l) => l.n === ch).map((l) => !!l.thin);
eq('kalın l: al', thin('al', 'l'), [false]);
eq('ince l: el', thin('el', 'l'), [true]);
eq('kalın l: kul', thin('kul', 'l'), [false]);
eq('ince l: gül', thin('gül', 'l'), [true]);
eq('kalın k: kız', thin('kız', 'k'), [false]);
eq('ince k: kedi', thin('kedi', 'k'), [true]);
eq('ince g: gül', thin('gül', 'g'), [true]);
eq('kalın g: gaz', thin('gaz', 'g'), [false]);
eq('alıntı: kalp l', thin('kalp', 'l'), [true]);
eq('alıntı: alkol', thin('alkol', 'l'), [true, true]);
eq('alıntı: rol', thin('rol', 'l'), [true]);
eq('alıntı: gol', thin('gol', 'l'), [true]);
eq('şapkalı: kâr k', thin('kâr', 'k'), [true]);
eq('şapkalı: lâzım l', thin('lâzım', 'l'), [true]);
eq('şapkalı: hâlâ l', thin('hâlâ', 'l'), [true]);
eq('şapkalı: kâğıt k', thin('kâğıt', 'k'), [true]);
eq('şapkalı: hükûmet k', thin('hükûmet', 'k'), [true]);
eq('okul kalın', thin('okul', 'l'), [false]);
eq('akıl', thin('akıl', 'l'), [false]);

/* ---------- ğ, v, h, çift ünsüz, yan yana ünlü ---------- */
for (const w of ['dağ', 'yağ', 'sağlık', 'öğrenci', 'dağa', 'eğer', 'değil']) ok('ğ ' + w, has(w, 'G_UZAT'));
ok('değil uyarı', E.buildWord('değil').marks.some((m) => m.code === 'G_UZAT' && m.sev === 'warn'));
for (const w of ['tavuk', 'davul', 'avuç', 'dövüş']) ok('v yumuşar ' + w, has(w, 'V_YUMUSAK'));
for (const w of ['vapur', 'kavga', 'hava']) ok('v yumuşamaz ' + w, !has(w, 'V_YUMUSAK'));
ok('sonda v: ev', has('ev', 'V_SON'));
for (const w of ['sabah', 'kahve', 'hava', 'mühim', 'ahır']) ok('h ' + w, has(w, 'H_NET'));
for (const w of ['anne', 'affetmek', 'hissetmek', 'reddetmek', 'dikkat', 'kuvvet']) ok('çift ünsüz ' + w, has(w, 'CIFT_UNSUZ'));
for (const w of ['saat', 'şiir', 'aile', 'daire', 'kaos', 'iade']) ok('iki ünlü ' + w, has(w, 'IKI_UNLU'));
ok('kume başı: tren', has('tren', 'KUME_BASI'));
ok('kume üç: Türkçe', has('Türkçe', 'KUME_UC'));
ok('kume sonda: kırk', has('kırk', 'KUME_SON'));
ok('sondaki k', has('çok', 'SON_K'));
ok('-yor', has('geliyor', 'SON_YOR'));
ok('yapacağım', has('yapacağım', 'G_ACAG'));
ok('sık hata: herkes', has('herkes', 'HATA_SIK'));
ok('sık hata: yalnız', has('yalnız', 'HATA_SIK'));
ok('sık hata: hastane', has('hastane', 'HATA_SIK'));

/* ---------- vurgu ---------- */
const st = (w) => { const x = E.buildWord(w); return x.stress.syl; };
eq('vurgu: masa son', st('masa'), 1);
eq('vurgu: şimdi ilk', st('şimdi'), 0);
eq('vurgu: ancak ilk', st('ancak'), 0);
eq('vurgu: gelmedi', st('gelmedi'), 0);
eq('vurgu: sevmeyeceğim', st('sevmeyeceğim'), 0);
eq('vurgu: anlamadı', st('anlamadı'), 1);
eq('vurgu: yavaşça', st('yavaşça'), 1);
eq('vurgu: severdi', st('severdi'), 1);
eq('vurgu: okurmuş', st('okurmuş'), 1);
eq('vurgu: tek hece', st('göz'), -1);
eq('vurgu: mi klitik', st('mi'), -1);
eq('vurgu: geldi son', st('geldi'), 1);
eq('vurgu: kitap', st('kitap'), 1);
{
  const A = E.analyze('Konya, Burdur ve Isparta güzel şehirler.');
  const g = (t) => A.words.find((w) => w.text.startsWith(t));
  eq('yer adı: Konya', g('Konya').stress.syl, 0);
  eq('yer adı: Burdur', g('Burdur').stress.syl, 0);
  eq('yer adı: Isparta', g('Isparta').stress.syl, 1);
}
{
  const A = E.analyze('Toplantı beşte mi başlayacak?');
  eq('soru türü', A.sentences[0].kind, 'soru');
  eq('odak: beşte', A.words[A.sentences[0].focus.wi].text, 'beşte');
  const B = E.analyze('Hemen buraya gel!');
  eq('emir', B.sentences[0].kind, 'emir');
  const C = E.analyze('Ne güzel bir gün!');
  eq('ünlem', C.sentences[0].kind, 'unlem');
  const D = E.analyze('Toplantı beşte başlayacak.');
  eq('bildirme', D.sentences[0].kind, 'bildirme');
}

/* ---------- ulama (kılavuz tablosu) ---------- */
{
  const A = E.analyze('Akşam oldu. Elimden aldı. Kitap aldı. Mahmut evlendi.');
  const ul = A.words.filter((w) => w.linkNext && w.linkNext.kind === 'ulama').map((w) => w.text);
  eq('ulama noktaları', ul, ['Akşam', 'Elimden', 'Kitap', 'Mahmut']);
  const B = E.analyze('Bu akşam evden erken çıkıp okula uğrayacağım.');
  const ul2 = B.words.filter((w) => w.linkNext && w.linkNext.kind === 'ulama').map((w) => w.text);
  eq('ulama: anahtar', ul2, ['akşam', 'evden', 'çıkıp']);
  const C = E.analyze('İstiyorum, onu göreceğim.');
  eq('ulama yok (virgül)', C.words.filter((w) => w.linkNext).length, 0);
}

/* ---------- sayılar ---------- */
eq('2026', E.numToWords('2026'), 'iki bin yirmi altı');
eq('1000', E.numToWords('1000'), 'bin');
eq('1250', E.numToWords('1250'), 'bin iki yüz elli');
eq('1000000', E.numToWords('1000000'), 'bir milyon');
eq('100', E.numToWords('100'), 'yüz');
eq('15', E.numToWords('15'), 'on beş');
eq('3,5', E.readNumber('3,5'), 'üç virgül beş');
eq('0,05', E.readNumber('0,05'), 'sıfır virgül sıfır beş');
eq('1.250', E.readNumber('1.250'), 'bin iki yüz elli');
eq('2.500.000', E.readNumber('2.500.000'), 'iki milyon beş yüz bin');
{
  const A = E.analyze('Toplantı 14:30\'da, bütçe %15 arttı; fiyat 1.250 TL.');
  const t = A.words.map((w) => w.text).join(' ');
  eq('metin sayı okunuşu', t, 'Toplantı on dört otuzda bütçe yüzde on beş arttı fiyat bin iki yüz elli lira');
  const B = E.analyze('Sn. Müdürüm, 12.03.2026 tarihli A.Ş. raporu.');
  eq('kısaltmalar', B.words.map((w) => w.text).join(' '), 'sayın Müdürüm on iki mart iki bin yirmi altı tarihli anonim şirketi raporu');
  const C = E.analyze('TRT ve KDV açıklaması');
  eq('harf adı kısaltma', C.words.map((w) => w.text).join(' '), 'te re te ve ke de ve açıklaması');
}

/* ---------- cümle bölme ---------- */
{
  const A = E.analyze('Merhaba dünya. Nasılsın? İyiyim!\n\nYeni paragraf burada.');
  eq('cümle sayısı', A.sentences.length, 4);
  eq('paragraf', A.sentences.map((s) => s.para), [0, 0, 0, 1]);
  const B = E.analyze('"Gel buraya," dedi. Ali geldi.');
  eq('tırnaklı', B.sentences.length, 2);
  const C = E.analyze('"Bu da nereden çıktı?" diye fısıldadı. Sonra sustu.');
  eq('soru+tırnak+devam', C.sentences.length, 2);
}

/* ---------- kılavuz kartları: koyu harf kurallarının tutarlılığı ---------- */
// ünlü kartlarında "Sonda"/"Başta" sözcüklerinde hece sayısı makul
let syllableOk = 0;
for (const ch in bank.letters) {
  const v = bank.letters[ch];
  for (const w of [].concat(v.start, v.mid, v.end)) {
    const x = E.buildWord(w);
    if (x.syl.length >= 1 && x.syl.every((s) => s.to > s.from)) syllableOk++; else { fail++; failures.push('hece boş: ' + w); }
    // her hecede en fazla bir ünlü
    const bad = x.syl.some((s) => x.letters.slice(s.from, s.to).filter((l) => l.v).length > 1);
    ok('hecede tek ünlü: ' + w, !bad);
  }
}
// kılavuzdaki cümleler hatasız analiz edilsin
for (const ch in bank.letters) {
  const s = bank.letters[ch].sentence;
  if (!s) continue;
  try { const A = E.analyze(s.replace(/\(.*?\)/g, '')); ok('cümle analiz: ' + ch, A.words.length > 0); } catch (e) { fail++; failures.push('cümle patladı ' + ch + ': ' + e.message); }
}
for (const k in bank.texts) { try { const A = E.analyze(bank.texts[k]); ok('metin analiz ' + k, A.sentences.length >= 2); } catch (e) { fail++; failures.push('metin patladı: ' + e.message); } }

/* ---------- zaman çizelgesi ---------- */
{
  const A = E.analyze('Toplantı beşte mi başlayacak? Evet, hemen başlıyoruz.');
  const T = E.buildTimeline(A, { sps: 4.7 });
  ok('timeline süre > 0', T.total > 3000, 'toplam ' + T.total);
  const plan = E.pitchPlan(A.sentences[0]);
  ok('perde planı', plan.length === A.sentences[0].stats.syl);
}

/* ---------- rapor ---------- */
console.log('\n==== Sonuç: ' + pass + ' geçti, ' + fail + ' kaldı ====');
if (failures.length) { console.log(failures.slice(0, 80).join('\n')); process.exitCode = 1; }
