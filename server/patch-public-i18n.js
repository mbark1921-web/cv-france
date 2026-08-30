import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
const swPath = path.resolve('public/sw.js');

let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

html = html.replace(
  "title:v('cvTitle')||'Mon CV'",
  "title:v('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV')"
);
html = html.replace(
  "title:v('letterTitle')||'Lettre'",
  "title:v('letterTitle')||(lang==='ar'?'رسالة التقديم':'Lettre')"
);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied public i18n runtime patch.');
}

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace("const C='cv-france-v20'", "const C='cv-france-v20-i18n1'");
  fs.writeFileSync(swPath, sw, 'utf8');
}
