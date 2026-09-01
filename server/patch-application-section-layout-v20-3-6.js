import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='APPLICATION_SECTION_LAYOUT_V20_3_6';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* APPLICATION_SECTION_LAYOUT_V20_3_6 */
#apps>.card.application-page{padding:0;border:0;background:transparent;box-shadow:none}
.application-page>h3{padding:0 4px;margin:0 0 18px;font-size:26px}
.application-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(310px,.75fr);gap:18px;align-items:start}
.application-panel{padding:22px;border:1px solid var(--border,#dfe5ee);border-radius:16px;background:#fff;box-shadow:var(--shadow,0 12px 34px rgba(15,27,45,.08))}
.application-panel h4{display:flex;align-items:center;gap:9px;margin:0 0 17px;color:var(--navy,#0f1b2d);font-size:18px}
.application-panel h4:before{content:"";width:9px;height:9px;border-radius:50%;background:var(--blue,#2563eb);box-shadow:0 0 0 5px rgba(37,99,235,.11)}
#appNotes{min-height:180px}
#appList{display:grid;gap:12px}
#appList:empty:before{display:block;padding:28px 14px;border:1px dashed #cbd5e1;border-radius:13px;color:var(--muted,#667085);text-align:center;content:"Aucune candidature enregistrée."}
html[dir="rtl"] #appList:empty:before{content:"لا توجد طلبات عمل محفوظة حالياً."}
#appList>div,#appList>p{margin:0!important;padding:16px!important;border:1px solid var(--border,#dfe5ee);border-radius:13px;background:#fff}
#appList button{margin:6px 4px 0}
@media(max-width:900px){.application-layout{grid-template-columns:1fr}.application-panel{padding:18px}}
</style>
<script>/* APPLICATION_SECTION_LAYOUT_V20_3_6_SCRIPT */
(function(){
  const card=document.querySelector('#apps>.card');
  if(!card||card.querySelector('.application-layout'))return;
  card.classList.add('application-page');
  const layout=document.createElement('div');layout.className='application-layout';card.appendChild(layout);
  function panel(key){const box=document.createElement('div');box.className='application-panel';const h=document.createElement('h4');h.dataset.applicationPanelTitle=key;box.appendChild(h);layout.appendChild(box);return box}
  const editor=panel('editor');
  ['appCompany','appRole','appStatus','appDate','appNotes'].forEach(id=>{const el=document.getElementById(id);if(el)editor.appendChild(el)});
  const toolbar=card.querySelector('.record-toolbar');if(toolbar)editor.appendChild(toolbar);
  const saved=panel('saved');const list=document.getElementById('appList');if(list)saved.appendChild(list);
  const titles={fr:{editor:'Ajouter une candidature',saved:'Candidatures suivies'},ar:{editor:'إضافة طلب عمل',saved:'طلبات العمل المتابعة'}};
  function localize(){const d=titles[document.documentElement.lang==='ar'?'ar':'fr'];layout.querySelectorAll('[data-application-panel-title]').forEach(h=>h.textContent=d[h.dataset.applicationPanelTitle])}
  localize();new MutationObserver(localize).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Application section layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Organized application creation and tracked applications into separate panels.');
