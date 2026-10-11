from playwright.sync_api import sync_playwright
URL='file:///home/claude/diksiyon-studyosu/index.html'
T="Toplantı 14.30'da başlayacak. Dr. Ayşe Yılmaz, 25 Mart 2026 tarihinde %15 zam açıkladı. Bu yıl 1.250 kişiye ulaştık; hedefimiz 2 katına çıkmak."
JS="""()=>{const vw=document.documentElement.clientWidth; const out=[];
 document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect(); if(!r.width||!r.height) return; if(r.right>vw+0.5||r.left<-0.5){ let p=e.parentElement,scr=false; while(p&&p!==document.body){const s=getComputedStyle(p); if(/(auto|scroll|hidden|clip)/.test(s.overflowX)&&p.getBoundingClientRect().width<=vw+1){scr=true;break} p=p.parentElement} if(!scr) out.push([(e.id?'#'+e.id:'')+'.'+(typeof e.className==='string'?e.className:'').split(' ').slice(0,3).join('.'),Math.round(r.left),Math.round(r.right)])}});
 return {sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,vw,sx:window.scrollX,out:out.slice(0,10)}}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for w in (360,390,412):
        ctx=b.new_context(viewport={'width':w,'height':780},device_scale_factor=3,is_mobile=True,has_touch=True,color_scheme='light',locale='tr-TR')
        pg=ctx.new_page(); pg.goto(URL); pg.fill('#inp',T); pg.press('#inp','Control+Enter'); pg.wait_for_timeout(3000)
        print(w,'durgun',pg.evaluate(JS))
        pg.tap('#btnPlay'); 
        for i in range(8):
            pg.wait_for_timeout(1000)
            r=pg.evaluate(JS)
            if r['sw']>r['vw'] or r['out']: print(w,'oynarken',i,r)
        # pbtn simge ortalı mı
        print(w,'pbtn',pg.evaluate("""()=>{const b=document.querySelector('#btnPlay').getBoundingClientRect(); const s=document.querySelector('#btnPlay svg:not([hidden])'); const vis=[...document.querySelectorAll('#btnPlay svg')].find(x=>x.getBoundingClientRect().width>0).getBoundingClientRect(); return {bx:b.left+b.width/2, by:b.top+b.height/2, sx:vis.left+vis.width/2, sy:vis.top+vis.height/2, kids:document.querySelector('#btnPlay').children.length}}"""))
        ctx.close()
