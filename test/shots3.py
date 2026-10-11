import sys, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
logs=[]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name,(w,h,scheme) in {'tab':(900,1000,'light'),'lap':(1100,800,'light'),'wide':(1680,1000,'light')}.items():
        ctx = b.new_context(viewport={'width':w,'height':h}, color_scheme=scheme, locale='tr-TR')
        page = ctx.new_page()
        page.on('console', lambda m: logs.append((name,m.type,m.text)) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: logs.append((name,'pageerror',str(e))))
        page.goto(URL); page.wait_for_timeout(1000)
        page.click('#samples .chip:nth-child(1)'); page.wait_for_timeout(3800)
        page.screenshot(path=OUT+f'40-{name}-studio.png')
        page.click('#stage .w >> nth=5'); page.wait_for_timeout(1000)
        page.screenshot(path=OUT+f'41-{name}-word.png')
        ctx.close()
    b.close()
print(json.dumps(logs, ensure_ascii=False))
