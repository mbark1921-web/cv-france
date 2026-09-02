import fs from 'node:fs';

const serverPath='server/index.js';
const htmlPath='public/index.html';
const marker='APPLICATION_EMPTY_DATE_FIX_V20_6_3';

let server=fs.readFileSync(serverPath,'utf8');
if(!server.includes(marker)){
  const old=`    input.applied_date || null,\n    input.notes || '',\n    id,\n    req.user.id\n  );`;
  const replacement=`    input.applied_date || '',\n    input.notes || '',\n    id,\n    req.user.id\n  ); /* ${marker} */`;
  if(!server.includes(old)) throw new Error('Application update date anchor not found');
  server=server.replace(old,replacement);
  fs.writeFileSync(serverPath,server,'utf8');
}

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes(marker)){
  const patch=String.raw`
<script>/* APPLICATION_EMPTY_DATE_FIX_V20_6_3 */
(function(){
  const refreshSaveLabel=()=>{
    const btn=document.querySelector('#apps button.primary');
    if(!btn)return;
    const badge=document.querySelector('#appModeBadge');
    const editing=/modification|تعديل/i.test(badge?.textContent||'');
    btn.textContent=editing?(document.documentElement.dir==='rtl'?'حفظ التعديلات':'Enregistrer les modifications'):(document.documentElement.dir==='rtl'?'إضافة':'Ajouter');
  };
  const oldMode=window.updateApplicationMode;
  if(typeof oldMode==='function'){
    window.updateApplicationMode=function(){const r=oldMode.apply(this,arguments);refreshSaveLabel();return r;};
  }
  setTimeout(refreshSaveLabel,200);
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
  fs.writeFileSync(htmlPath,html,'utf8');
}

console.log('Fixed candidature update for blank applied_date and clarified edit save label.');
