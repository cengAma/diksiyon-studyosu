#!/usr/bin/env node
/* Diksiyon Stüdyosu — tek dosyalık derleme
   Kullanım: node tools/build.js   →  dist/diksiyon-studyosu.html
   Yazı tipleri, kılavuz verisi, motor, stil ve arayüz kodu tek HTML dosyasına gömülür. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');
const FP = 'tools/node_modules/@fontsource-variable/';

const U_LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const U_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

function face(family, file, weight, stretch, range) {
  return '@font-face{font-family:\'' + family + '\';font-style:normal;font-display:swap;font-weight:' + weight + ';' + (stretch ? 'font-stretch:' + stretch + ';' : '') +
    'src:url(data:font/woff2;base64,' + b64(file) + ') format(\'woff2\');unicode-range:' + range + '}';
}
const fonts = [
  face('Bricolage Grotesque', FP + 'bricolage-grotesque/files/bricolage-grotesque-latin-ext-wdth-normal.woff2', '200 800', '75% 100%', U_EXT),
  face('Bricolage Grotesque', FP + 'bricolage-grotesque/files/bricolage-grotesque-latin-wdth-normal.woff2', '200 800', '75% 100%', U_LATIN),
  face('Literata', FP + 'literata/files/literata-latin-ext-wght-normal.woff2', '200 900', '', U_EXT),
  face('Literata', FP + 'literata/files/literata-latin-wght-normal.woff2', '200 900', '', U_LATIN)
].join('\n');

const cssDir = path.join(root, 'src/css');
const css = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css')).sort().map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');

const jsDir = path.join(root, 'src/js');
const js = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort().map((f) => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
const app = '(function () {\n\'use strict\';\n' + js + '\n})();';

const bank = 'window.DIKSIYON_BANK = ' + JSON.stringify(JSON.parse(rd('data/guide_bank.json'))).replace(/<\//g, '<\\/') + ';';
const engine = rd('src/engine.js');

let html = rd('src/app.html');
const put = (k, v) => { html = html.replace('/*{{' + k + '}}*/', () => v); };
put('FONTS', fonts); put('CSS', css); put('BANK', bank); put('ENGINE', engine); put('APP', app);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist/diksiyon-studyosu.html');
fs.writeFileSync(out, html);
console.log('yazıldı:', out, (html.length / 1024).toFixed(0) + ' KB');
