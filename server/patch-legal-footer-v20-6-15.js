import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='LEGAL_FOOTER_V20_6_15';

if(html.includes(marker)){
  console.log('Legal footer patch already applied.');
  process.exit(0);
}

const patch=String.raw`
<style>/* ${marker} */
#legalFooter{max-width:1100px;margin:26px auto 18px;padding:0 20px 18px;text-align:center;color:#667085;font-size:14px}
#legalFooter a{color:#315078;text-decoration:none;font-weight:600}
#legalFooter a:hover{text-decoration:underline}
#legalFooter .sep{margin:0 8px;color:#98a2b3}
</style>
<footer id="legalFooter" aria-label="Informations légales">
  <a href="/privacy.html">Confidentialité</a><span class="sep">•</span><a href="/terms.html">Conditions d'utilisation</a>
</footer>`;

html=html.replace('</body></html>',patch+'</body></html>');
if(!html.includes(marker)) throw new Error('Legal footer patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Applied legal footer links.');
