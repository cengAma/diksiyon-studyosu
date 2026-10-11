import time, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
BASE = ("Sonbaharda renkli yaprakları sanki kimse toplamıyor. Bu da nereden çıktı diye fısıldadı, kapıyı yavaşça kapattı. "
        "Toplantı 14.30'da başlayacak; hepiniz hazır olun! Dün akşam kalbim hızla çarpıyordu, ama hâlâ sakin görünmeye çalıştım. "
        "İnsanlar genellikle yanlış anlaşılmaktan korkar, oysa asıl mesele doğru dinlemektir. Bugün hava çok güzel, yarın yağmur bekleniyor. ")
logs=[]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':1440,'height':900}, color_scheme='dark', locale='tr-TR')
    page = ctx.new_page()
    page.on('console', lambda m: logs.append((m.type, m.text)) if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
    page.goto(URL); page.wait_for_timeout(600)
    for reps in (6, 20, 60):
        text = (BASE*reps)
        words = len(text.split())
        page.goto(URL); page.wait_for_timeout(400)
        page.fill('#inp', text)
        t0=time.time()
        page.press('#inp','Control+Enter')
        page.wait_for_selector('#stage .w', timeout=60000)
        page.wait_for_function("document.querySelectorAll('#stage .w').length > 5", timeout=60000)
        t1=time.time()
        nw = page.evaluate("document.querySelectorAll('#stage .w').length")
        page.wait_for_timeout(1500)
        # layer toggle timing in-page
        tog = page.evaluate("""() => { const t0=performance.now(); document.querySelector('#lys .ly[data-ly="n"]').click(); const t1=performance.now();
           return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r([t1-t0, performance.now()-t0])))) }""")
        # long task / frame test: scroll
        fr = page.evaluate("""() => new Promise(res=>{ let n=0, last=performance.now(), worst=0, start=last; 
            function f(t){ worst=Math.max(worst,t-last); last=t; n++; window.scrollBy(0,120); if(t-start<1500) requestAnimationFrame(f); else res({fps:n/((t-start)/1000), worst}) }
            requestAnimationFrame(f)})""")
        dom = page.evaluate("document.getElementsByTagName('*').length")
        perfcls = page.evaluate("document.body.classList.contains('perf') || document.documentElement.classList.contains('perf')")
        print(f"{words} kelime: analiz+render {t1-t0:.2f}s, .w={nw}, DOM={dom}, perf={perfcls}, katman tıkı {tog[0]:.0f}ms/{tog[1]:.0f}ms, kaydırma fps={fr['fps']:.0f} en kötü kare={fr['worst']:.0f}ms")
    print('KONSOL', logs)
