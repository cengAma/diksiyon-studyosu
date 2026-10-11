import sys, json, time
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
logs = []; results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond), extra))
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra and not cond else ''))
TEXT = 'Sonbaharda renkli yaprakları sanki kimse toplamıyor. "Bu da nereden çıktı?" diye fısıldadı. Toplantı 14.30\'da başlayacak; hepiniz hazır olun!'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    ctx = b.new_context(viewport={'width':1440,'height':900}, color_scheme='dark', locale='tr-TR', permissions=['microphone'])
    page = ctx.new_page()
    page.on('console', lambda m: logs.append((m.type, m.text)) if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
    page.goto(URL); page.wait_for_timeout(800)
    # 1 canlı yazım
    page.fill('#inp', 'bugün hava çok güzel kalp')
    page.wait_for_timeout(900)
    check('canlı kart son sözcüğü gösteriyor', 'son sözcük' in page.inner_text('#liveSrc'), page.inner_text('#liveSrc'))
    check('canlı kart kalp', 'kalp' in page.inner_text('#liveWord').replace('\n',''))
    # 2 çözümle
    page.fill('#inp', TEXT)
    page.press('#inp', 'Control+Enter')
    page.wait_for_timeout(3800)
    ns = page.evaluate("document.querySelectorAll('#stage .sent').length")
    nw = page.evaluate("document.querySelectorAll('#stage .w').length")
    check('cümle sayısı 3-4', ns in (3,4), ns)
    check('sözcük sayısı > 15', nw > 15, nw)
    check('hero gizlendi', page.evaluate("document.getElementById('hero').hidden"))
    check('dock görünür', page.evaluate("document.getElementById('dock').classList.contains('on')"))
    on = page.get_attribute('#stage','data-on')
    check('varsayılan katmanlar açıldı', 'vurgu' in on and 'unlu' in on, on)
    # 3 katman
    page.click('#lys .ly[data-ly="n"]'); page.wait_for_timeout(300)
    check('n katmanı açıldı', 'n' in page.get_attribute('#stage','data-on').split())
    page.keyboard.press('Escape')
    page.press('#stage', 'Home') if False else None
    page.click('body', position={'x':5,'y':500})
    page.keyboard.press('5'); page.wait_for_timeout(200)
    check('5 tuşu n katmanını kapattı', 'n' not in page.get_attribute('#stage','data-on').split(), page.get_attribute('#stage','data-on'))
    page.click('#presets .pre[data-pre="hepsi"]'); page.wait_for_timeout(500)
    check('hepsi: 11 katman', len(page.get_attribute('#stage','data-on').split())==11)
    # 4 sözcük/harf tıkla
    page.click('#stage .l.nm >> nth=0'); page.wait_for_timeout(700)
    lab = page.inner_text('#labBody')
    check('lab n→m kuralı', 'n → m' in lab, lab[:120])
    check('lab güven rozeti', 'Kesin kural' in lab or 'Genel eğilim' in lab)
    check('lab benzer sözcükler', 'başka sözcükler' in lab)
    # 5 lab sözcük dene
    page.fill('#labIn', 'kalp'); page.wait_for_timeout(600)
    check('lab serbest sözcük', 'kalp' in page.inner_text('#labBody .lab-word') and 'serbest' in page.inner_text('#labBody'))
    check('kalp ince l kuralı', 'İnce l' in page.inner_text('#labBody'))
    page.click('#labBody [data-back]'); page.wait_for_timeout(400)
    # 6 oynat
    page.click('#btnPlay'); page.wait_for_timeout(1800)
    check('çalıyor: .w.now var', page.evaluate("!!document.querySelector('#stage .w.now')"))
    check('dock playing', page.evaluate("document.getElementById('dock').classList.contains('playing')"))
    t1 = page.evaluate("DK.P.t")
    page.click('#btnPlay'); 
    check('duraklatıldı', not page.evaluate("DK.P.playing"))
    box = page.locator('#track').bounding_box()
    page.mouse.click(box['x']+box['width']*0.7, box['y']+box['height']/2); page.wait_for_timeout(300)
    t2 = page.evaluate("DK.P.t"); tot = page.evaluate("DK.P.tl.total")
    check('ilerleme çubuğu atlıyor', abs(t2/tot-0.7) < 0.08, (t2, tot))
    check('atlama sonrası done sözcükler', page.evaluate("document.querySelectorAll('#stage .w.done').length") > 3)
    page.click('#btnNext'); page.wait_for_timeout(300)
    # tempo
    page.click('#tempo [data-t="hizli"]'); page.wait_for_timeout(200)
    tot2 = page.evaluate("DK.P.tl.total")
    check('hızlı tempo süreyi kısaltıyor', tot2 < tot*0.85, (tot, tot2))
    page.click('#tempo [data-t="normal"]')
    # sentence play
    page.evaluate("DK.playSentence(0,false)"); page.wait_for_timeout(1200)
    check('cümle oynatma aralığı', page.evaluate("!!DK.P.range && DK.P.playing"))
    page.wait_for_timeout(6000)
    check('cümle bitince durdu', not page.evaluate("DK.P.playing"), page.evaluate("DK.P.t"))
    # prompter
    page.keyboard.press('p'); page.wait_for_timeout(500)
    check('prompter açıldı', page.evaluate("document.getElementById('prompter').classList.contains('on')"))
    page.screenshot(path=OUT+'30-prompter.png')
    page.keyboard.press('Escape'); page.wait_for_timeout(200)
    check('prompter kapandı', not page.evaluate("document.getElementById('prompter').classList.contains('on')"))
    # cümle paneli
    page.click('#stage .sg >> nth=1'); page.wait_for_timeout(800)
    check('cümle paneli soru türü', 'Soru' in page.inner_text('#sentBody'))
    check('ton şeridi çizildi', page.evaluate("document.querySelectorAll('#sentBody svg.tone').length") >= 1)
    page.click('#sentBody [data-kind="emir"]'); page.wait_for_timeout(300)
    check('tür geçersiz kılma', page.evaluate("DK.App.A.sentences[1].kind") == 'emir')
    page.screenshot(path=OUT+'31-sent.png')
    # hoca modu
    page.check('#swHoca'); page.wait_for_timeout(300)
    check('hoca açık', page.evaluate("DK.App.hoca.on"))
    page.click('#stage .w >> nth=1'); page.wait_for_timeout(500)
    check('hoca kutusu', 'Hoca notu' in page.inner_text('#labBody'))
    page.click('#labBody [data-hs="0"]'); page.wait_for_timeout(600)
    check('hoca vurgusu kaydedildi', len(page.evaluate("Object.keys(DK.App.hoca.stress)")) == 1)
    check('hoca etiketi', 'Hocaya göre' in page.inner_text('#labBody'))
    page.screenshot(path=OUT+'32-hoca.png')
    # rapor
    page.click('#tabs [data-view="report"]'); page.wait_for_timeout(1500)
    check('rapor kutuları', page.evaluate("document.querySelectorAll('#report .tile').length") == 6)
    check('rapor işaretli metin', '//' in page.inner_text('#rpMarked'))
    # alıştırma
    page.click('#tabs [data-view="practice"]'); page.wait_for_timeout(600)
    page.click('#lgrid [data-letter="e"]'); page.wait_for_timeout(600)
    check('harf kartı', 'Başta' in page.inner_text('#drill'))
    page.click('#drill [data-mini] >> nth=0'); page.wait_for_timeout(600)
    check('mini lab', page.evaluate("document.querySelectorAll('#miniLab .lab-word').length") >= 1)
    page.click('#drill [data-load="all"]'); page.wait_for_timeout(2500)
    check('harf alıştırması sahneye alındı', page.evaluate("DK.App.view") == 'read' and 'e harfi' in page.inner_text('#tbText'), page.inner_text('#tbText'))
    # kelime avı
    page.click('#tabs [data-view="practice"]'); page.wait_for_timeout(500)
    page.click('#huntMode [data-v="e"]'); page.click('#huntSrc [data-v="bank"]'); page.click('#huntGo'); page.wait_for_timeout(500)
    check('soru göründü', page.evaluate("!!document.querySelector('#huntArea .q')"))
    for i in range(10):
        if not page.evaluate("!!document.querySelector('#huntArea .q .opts button')"): break
        page.click('#huntArea .opts button >> nth=0'); page.wait_for_timeout(250)
        page.click('#qNext'); page.wait_for_timeout(250)
    check('av bitti', 'Bitti' in page.inner_text('#huntArea'), page.inner_text('#huntArea')[:60])
    page.screenshot(path=OUT+'33-hunt-end.png')
    page.click('#huntBack2')
    # kayıt
    page.click('#tabs [data-view="read"]'); page.wait_for_timeout(500)
    page.click('#btnRec'); page.wait_for_timeout(3500)
    check('kayıt başladı', page.evaluate("DK.App && document.getElementById('btnRec').classList.contains('rec-on')"))
    page.click('#btnRec'); page.wait_for_timeout(2500)
    check('kayıt sonucu açıldı', page.evaluate("document.getElementById('dlgRec').open"))
    check('kayıt tuvali', page.evaluate("!!document.getElementById('recCv')"))
    page.screenshot(path=OUT+'34-rec.png')
    b.close()
print('\nKONSOL:', json.dumps(logs, ensure_ascii=False, indent=1))
fails = [r for r in results if not r[1]]
print('\n%d/%d geçti' % (len(results)-len(fails), len(results)))
