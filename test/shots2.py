import sys, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
logs = []
def attach(page, tag):
    page.on('console', lambda m: logs.append((tag, m.type, m.text)) if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append((tag, 'pageerror', str(e))))
which = sys.argv[1] if len(sys.argv) > 1 else 'all'
with sync_playwright() as p:
    b = p.chromium.launch()
    if which in ('all','dark'):
        ctx = b.new_context(viewport={'width':1440,'height':900}, color_scheme='dark', locale='tr-TR')
        page = ctx.new_page(); attach(page,'dark')
        page.goto(URL); page.wait_for_timeout(2500)
        page.screenshot(path=OUT+'10-dark-hero.png')
        page.click('#samples .chip:nth-child(2)'); page.wait_for_timeout(4000)
        page.click('#presets .pre[data-pre="hepsi"]'); page.wait_for_timeout(1800)
        page.screenshot(path=OUT+'11-dark-all.png')
        page.click('#presets .pre[data-pre="okuma"]'); page.wait_for_timeout(900)
        page.click('#btnPlay'); page.wait_for_timeout(3600)
        page.screenshot(path=OUT+'12-dark-play.png')
        page.click('#btnPlay')
        page.click('#stage .w >> nth=3'); page.wait_for_timeout(800)
        page.click('.stabs [data-pane="sent"]'); page.wait_for_timeout(1500)
        page.screenshot(path=OUT+'13-dark-sent.png')
        page.click('#tabs [data-view="report"]'); page.wait_for_timeout(1800)
        page.screenshot(path=OUT+'14-dark-report.png', full_page=True)
        page.click('#tabs [data-view="practice"]'); page.wait_for_timeout(900)
        page.screenshot(path=OUT+'15-dark-practice.png', full_page=True)
        ctx.close()
    if which in ('all','mobile'):
        ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark', locale='tr-TR', has_touch=True, is_mobile=True)
        page = ctx.new_page(); attach(page,'mobile')
        page.goto(URL); page.wait_for_timeout(2200)
        page.screenshot(path=OUT+'20-m-hero.png')
        page.click('#samples .chip:nth-child(2)'); page.wait_for_timeout(4200)
        page.screenshot(path=OUT+'21-m-studio.png')
        page.tap('#stage .w >> nth=4'); page.wait_for_timeout(1200)
        page.screenshot(path=OUT+'22-m-word.png')
        ctx.close()
    b.close()
print(json.dumps(logs, ensure_ascii=False, indent=1))
