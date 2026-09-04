import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='MENTIONS_FOOTER_V20_6_16';

if(html.includes(marker)){
  console.log('Mentions footer patch already applied.');
  process.exit(0);
}

const oldFooter='<a href="/privacy.html">Confidentialité</a><span class="sep">•</span><a href="/terms.html">Conditions d\'utilisation</a>';
const newFooter='<span id="'+marker+'"></span><a href="/mentions-legales.html">Mentions légales</a><span class="sep">•</span><a href="/privacy.html">Confidentialité</a><span class="sep">•</span><a href="/terms.html">Conditions d\'utilisation</a>';

if(!html.includes(oldFooter)) throw new Error('Legal footer anchor not found');
html=html.replace(oldFooter,newFooter);
fs.writeFileSync(file,html,'utf8');
console.log('Added Mentions légales link to footer.');
