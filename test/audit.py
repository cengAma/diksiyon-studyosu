import sys, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/index.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
T = 'Sonbaharda renkli yaprakları sanki kimse toplamıyor. "Bu da nereden çıktı?" diye fısıldadı. Toplantı 14.30\'da başlayacak; hepiniz hazır olun!'
VPS = [('p360',360,780,3,True,'light'),('p320',320,640,3,True,'dark'),('p300',300,640,3,True,'light'),('land',844,390,3,True,'dark'),('t768',768,1024,2,True,'dark'),('d1366',1366,768,1,False,'dark'),('d1920',1920,1080,1,False,'light'),('d2560',2560,1440,1,False,'dark')]
JS_OVER = """() => {
  const vw = document.documentElement.clientWidth, out = [];
  const sw = document.documentElement.scrollWidth;
  document.querySelectorAll('body *').forEach(e => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    // kaydırılabilir bir atanın içindeyse yoksay
    let p = e.parentElement, scr = false;
    while (p && p !== document.body) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(ps.overflowX) && p.getBoundingClientRect().width <= vw + 1) { scr = true; break; } p = p.parentElement; }
    if (scr) return;
    if (r.right > vw + 1 || r.left < -1) out.push([(e.id ? '#' + e.id : '') + '.' + (typeof e.className === 'string' ? e.className : '').split(' ').slice(0,2).join('.') + ' <' + e.tagName.toLowerCase() + '>', Math.round(r.left), Math.round(r.right)]);
  });
  return { vw, sw, over: out.slice(0, 14), n: out.length };
}"""
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    for name, w, h, dsf, mob, sch in VPS:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, is_mobile=mob, has_touch=mob, color_scheme=sch, locale='tr-TR')
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: logs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(700)
        r0 = pg.evaluate(JS_OVER)
        pg.screenshot(path=OUT + f'a_{name}_0hero.png')
        pg.fill('#inp', T); pg.press('#inp', 'Control+Enter'); pg.wait_for_timeout(3200)
        r1 = pg.evaluate(JS_OVER)
        pg.screenshot(path=OUT + f'a_{name}_1stage.png')
        # oynat
        try:
            pg.click('#btnPlay', timeout=1500); pg.wait_for_timeout(1200)
        except Exception as e: logs.append(name + ' play: ' + str(e)[:80])
        pg.screenshot(path=OUT + f'a_{name}_2play.png')
        r2 = pg.evaluate(JS_OVER)
        try: pg.click('#btnPlay', timeout=1500)
        except Exception: pass
        # sözcük seç
        try:
            pg.click('#stage .w >> nth=3', timeout=1500); pg.wait_for_timeout(1300)
        except Exception as e: logs.append(name + ' word: ' + str(e)[:80])
        r3 = pg.evaluate(JS_OVER)
        pg.screenshot(path=OUT + f'a_{name}_3word.png')
        # alıştırma + rapor
        res = {}
        for v in ('practice', 'report'):
            try:
                pg.evaluate(f"window.DK.goView('{v}')"); pg.wait_for_timeout(900)
                res[v] = pg.evaluate(JS_OVER); pg.screenshot(path=OUT + f'a_{name}_4{v}.png')
            except Exception as e: logs.append(name + ' ' + v + ': ' + str(e)[:80])
        print(f"== {name} {w}x{h}: hero sw={r0['sw']}/{r0['vw']} n={r0['n']} | stage sw={r1['sw']} n={r1['n']} | play n={r2['n']} | word sw={r3['sw']} n={r3['n']} | pr n={res.get('practice',{}).get('n')} rp n={res.get('report',{}).get('n')}")
        for tag, r in (('hero', r0), ('stage', r1), ('play', r2), ('word', r3)):
            for o in r['over'][:6]: print('    ', tag, o)
        for v, r in res.items():
            for o in r['over'][:5]: print('    ', v, o)
        ctx.close()
    print('LOGS', logs)
