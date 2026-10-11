# Diksiyon Stüdyosu

Bir metin verildiğinde Türkçe diksiyon kurallarını **cümle → sözcük → hece → harf** düzeyinde gösteren, tek dosyalık web uygulaması.

**Kullanmak için:** [`dist/diksiyon-studyosu.html`](dist/diksiyon-studyosu.html) dosyasını indirip çift tıklayın. İnternet gerekmez; yazdığınız metin tarayıcıdan dışarı çıkmaz. Ses kaydı özellikleri için Chrome veya Edge önerilir.

## Neler var?

- **Katmanlar:** vurgu, durak ve soluk, ulama, açık/kapalı e, uzun ünlüler, n→m ve n→ng, kalın/ince l-k-g, ğ-v-h, çift ünsüz, sondaki ünsüz, zor kümeler, sık yapılan hatalar.
- **Sözcük laboratuvarı:** bir harfe ya da sözcüğe tıklayınca kural, "nasıl söylenir" ve örnekler.
- **Cümle düzeyi:** karaoke okuma, soluk ölçer, ton eğrisi, cümle türü ve rapor.
- **Alıştırma:** alıştırma üretici, kelime avı, prompter, kendi sesini kaydedip dinleme.
- **Hoca modu:** hocanın söyleyişini sözlüğe ekleyerek uygulamayı kendi eğitimine uydurma.
- Yazdırma, bağlantıyla paylaşma, açık/koyu tema, mobil uyum.

## Sınırlar (dürüst notlar)

- Açık/kapalı e, damak n'si, ğ'yi uzatma ve vurgu istisnaları **kesin kural değil, genel eğilim**tir; uygulamada "Genel eğilim" / "Hocaya sor" etiketiyle gösterilir.
- Yabancı kökenli sözcüklerdeki l/k/g istisnaları küçük bir sözlükle sınırlıdır; kullanıcı ekleyebilir.
- Kayıt analizi (durak ve ses yüksekliği) deneyseldir. Konuşma tanıma yoktur; sesli okuma yoktur.

## Geliştirme

```bash
cd tools && npm install && cd ..   # yazı tipleri (Bricolage Grotesque, Literata)
node tools/build.js                # dist/diksiyon-studyosu.html üretir
node test/engine.test.js           # kural motoru testleri
python3 test/func.py               # tarayıcıda arayüz testleri (Playwright gerekir)
```

## Yapı

```
src/engine.js      kural motoru (belirteçleme, heceleme, işaret kayıt defteri, zaman çizelgesi)
src/js/            arayüz modülleri (sahne, laboratuvar, oynatma, kayıt, rapor, alıştırma)
src/css/           stiller
src/app.html       sayfa şablonu
data/guide_bank.json   "Türkçe Diksiyon Kılavuzu"ndan türetilen kural/örnek bankası
tools/             derleme betiği ve kılavuz ayıklama aracı
test/              motor ve arayüz testleri
dist/              derlenmiş tek dosyalık uygulama
```

Hazırlayan: Anıl Mithatcan Akbaş
