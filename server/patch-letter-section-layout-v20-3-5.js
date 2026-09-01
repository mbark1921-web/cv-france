import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='LETTER_SECTION_LAYOUT_V20_3_5';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* LETTER_SECTION_LAYOUT_V20_3_5 */
#letters>.card.letter-page{padding:0;border:0;background:transparent;box-shadow:none}
.letter-page>h3{padding:0 4px;margin:0 0 18px;font-size:26px}
.letter-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:18px;align-items:start}
.letter-panel{padding:22px;border:1px solid var(--border,#dfe5ee);border-radius:16px;background:#fff;box-shadow:var(--shadow,0 12px 34px rgba(15,27,45,.08))}
.letter-panel h4{display:flex;align-items:center;gap:9px;margin:0 0 17px;color:var(--navy,#0f1b2d);font-size:18px}
.letter-panel h4:before{content:"";width:9px;height:9px;border-radius:50%;background:var(--blue,#2563eb);box-shadow:0 0 0 5px rgba(37,99,235,.11)}
#letterContent{min-height:240px}
#letterList{display:grid;gap:12px}
#letterList>div,#letterList>p{margin:0!important;padding:16px!important;border:1px solid var(--border,#dfe5ee);border-radius:13px;background:#fff}
#letterList button{margin:6px 4px 0}
@media(max-width:900px){.letter-layout{grid-template-columns:1fr}.letter-panel{padding:18px}}
</style>
<script>/* LETTER_SECTION_LAYOUT_V20_3_5_SCRIPT */
(function(){
  const card=document.querySelector('#letters>.card');
  if(!card||card.querySelector('.letter-layout'))return;
  card.classList.add('letter-page');
  const layout=document.createElement('div');layout.className='letter-layout';card.appendChild(layout);
  function panel(key){const box=document.createElement('div');box.className='letter-panel';const h=document.createElement('h4');h.dataset.letterPanelTitle=key;box.appendChild(h);layout.appendChild(box);return box}
  const editor=panel('editor');
  ['letterTitle','letterCompany','letterRole','letterContent'].forEach(id=>{const el=document.getElementById(id);if(el)editor.appendChild(el)});
  const toolbar=card.querySelector('.record-toolbar');if(toolbar)editor.appendChild(toolbar);
  const saved=panel('saved');const list=document.getElementById('letterList');if(list)saved.appendChild(list);
  const titles={fr:{editor:'Créer une lettre',saved:'Lettres enregistrées'},ar:{editor:'إنشاء رسالة تقديم',saved:'الرسائل المحفوظة'}};
  function localize(){const d=titles[document.documentElement.lang==='ar'?'ar':'fr'];layout.querySelectorAll('[data-letter-panel-title]').forEach(h=>h.textContent=d[h.dataset.letterPanelTitle])}
  localize();new MutationObserver(localize).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Letter section layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Organized the letter editor and saved letters into separate panels.');
