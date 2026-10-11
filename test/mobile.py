from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
TEXT = 'Sonbaharda renkli yaprakları sanki kimse toplamıyor. "Bu da nereden çıktı?" diye fısıldadı. Toplantı 14.30\'da başlayacak; hepiniz hazır olun!'
logs=[]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name,vw,vh,scheme in (('m390',390,844,'dark'),('m390l',390,844,'light'),('t820',820,1180,'dark')):
        ctx = b.new_context(viewport={'width':vw,'height':vh}, color_scheme=scheme, locale='tr-TR', device_scale_factor=2, is_mobile=(vw<500), has_touch=(vw<900))
        page = ctx.new_page()
        page.on('console', lambda m: logs.append((m.type, m.text)) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
        page.goto(URL); page.wait_for_timeout(900)
        page.screenshot(path=OUT+f'q_{name}_hero.png')
        page.fill('#inp', TEXT); page.press('#inp','Control+Enter'); page.wait_for_timeout(3500)
        page.screenshot(path=OUT+f'q_{name}_stage.png')
        ov = page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        print(name, 'scrollWidth/innerWidth', ov)
        # select a word
        page.click('#stage .w >> nth=3'); page.wait_for_timeout(1200)
        page.screenshot(path=OUT+f'q_{name}_word.png')
        print(name, 'after-select overflow', page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"))
        ctx.close()
    print('KONSOL', logs)
