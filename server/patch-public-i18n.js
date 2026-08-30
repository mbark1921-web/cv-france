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

const atsNeedle = "function normWord(s){return String(s||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim()}function atsTokens(text){return String(text||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\p{L}\\p{N}+#]+/gu,' ').split(/\\s+/).map(normWord).filter(w=>w.length>=3&&!ATS_STOP.has(w))}";
const atsReplacement = "const ATS_GENERIC=new Set(['recherchons','recherche','rechercher','recherchez','assurer','assure','assurent','bon','bonne','bons','bonnes','apprecie','apprecies','appreciee','appreciees','souhaite','souhaitons','requis','requise','requises','necessaire','necessaires','ideal','ideale','ideales','principal','principale','principales','notamment','egalement','capable','capacite','faire','fait','mettre','permettre','participer','contribuer','rejoindre','rejoignez','proposer','propose','offrir','offre','selon','grace','aupres','ainsi','etre','avoir']);function normWord(s){return String(s||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim()}function atsTokens(text){return String(text||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\p{L}\\p{N}+#]+/gu,' ').split(/\\s+/).map(normWord).filter(w=>w.length>=3&&!ATS_STOP.has(w)&&!ATS_GENERIC.has(w))}";
html = html.replace(atsNeedle, atsReplacement);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied public i18n/ATS runtime patch.');
}

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace("const C='cv-france-v20'", "const C='cv-france-v20-ats2'");
  fs.writeFileSync(swPath, sw, 'utf8');
}
