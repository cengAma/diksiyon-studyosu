from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/diksiyon-studyosu/dist/diksiyon-studyosu.html'
OUT = '/home/claude/diksiyon-studyosu/test/shots/'
logs=[]
cases = {
 'noktalama': '... !!! ??? --- ,,,',
 'ingilizce': 'The quick brown fox jumps over the lazy dog. Hello world!',
 'uzunkelime': 'Çekoslovakyalılaştıramadıklarımızdanmışsınızcasına ' + 'a'*200,
 'emoji': 'Merhaba 😊 dünya! 🎉 Nasılsın?',
 'sayilar': '1923 yılında 29 Ekim\'de %50 indirim, 3,5 kg ve 12.05.2024 tarihli 5. madde.',
 'tek': 'a',
 'bosluk': '   \n\n   ',
 'html': '<script>alert(1)</script> <b>kalın</b> & "tırnak"',
 'ceviri': 'Bir iki üç.\n\nİkinci paragraf başlıyor; burada virgül, ve nokta var… sonra soru mu? evet!',
}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':1280,'height':800}, color_scheme='dark', locale='tr-TR', reduced_motion='reduce')
    page = ctx.new_page()
    dialogs=[]
    page.on('dialog', lambda d: (dialogs.append(d.message), d.dismiss()))
    page.on('console', lambda m: logs.append((m.type, m.text)) if m.type in ('error','warning') else None)
    page.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
    for k,t in cases.items():
        page.goto(URL); page.wait_for_timeout(300)
        page.fill('#inp', t)
        page.press('#inp','Control+Enter'); page.wait_for_timeout(1200)
        nw = page.evaluate("document.querySelectorAll('#stage .w').length")
        hero = page.evaluate("document.getElementById('hero').hidden")
        toast = page.evaluate("(document.querySelector('.toast')||{}).textContent||''")
        print(f"{k}: .w={nw} hero_hidden={hero} toast={toast.strip()[:60]!r}")
    print('dialogs', dialogs)
    # reduced-motion & keyboard focus
    page.goto(URL); page.wait_for_timeout(300)
    page.fill('#inp', 'Bugün hava çok güzel, kalp atışlarım hızlandı.'); page.press('#inp','Control+Enter'); page.wait_for_timeout(1500)
    res=[]
    for i in range(14):
        page.keyboard.press('Tab')
        info = page.evaluate("""() => { const e=document.activeElement; if(!e) return null; const cs=getComputedStyle(e);
          const bs=cs.boxShadow; return {tag:e.tagName, id:e.id, cls:(e.className&&e.className.baseVal===undefined?e.className:'').toString().slice(0,30), outline:cs.outlineStyle+' '+cs.outlineWidth, shadow:bs!=='none', label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24)} }""")
        res.append(info)
    noring=[r for r in res if r and r['outline'].startswith('none') and not r['shadow']]
    print('tab sayısı', len(res), 'halkasız', noring)
    # print media
    page.emulate_media(media='print')
    page.pdf(path=OUT+'print.pdf', format='A4')
    print('KONSOL', logs)
