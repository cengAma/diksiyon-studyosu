import sys, json, time
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
logs = []
def attach(page, tag):
    page.on('console', lambda m: logs.append((tag, m.type, m.text)) if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append((tag, 'pageerror', str(e))))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':1440,'height':900}, device_scale_factor=1, locale='tr-TR')
    page = ctx.new_page(); attach(page,'desktop')
    page.goto(URL); page.wait_for_timeout(1200)
    page.screenshot(path=OUT+'01-hero.png')
    page.wait_for_timeout(2600)
    page.screenshot(path=OUT+'01b-hero-later.png')
    # örnek: anlatı
    page.click('#samples .chip:nth-child(2)')
    page.wait_for_timeout(4200)
    page.screenshot(path=OUT+'02-studio.png')
    # kelimeye tıkla
    page.click('#stage .w >> nth=6')
    page.wait_for_timeout(1200)
    page.screenshot(path=OUT+'03-word.png')
    page.click('#presets .pre[data-pre="harf"]')
    page.wait_for_timeout(1800)
    page.screenshot(path=OUT+'04-harf.png')
    b.close()
print(json.dumps(logs, ensure_ascii=False, indent=1))
