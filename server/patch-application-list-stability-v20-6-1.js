import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='APPLICATION_LIST_STABILITY_V20_6_1';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* APPLICATION_LIST_STABILITY_V20_6_1 */
(function(){
  let appLoadGeneration=0;

  window.loadAppsFinal=async function(){
    const box=document.getElementById('appList');
    if(!box||!token)return;
    const generation=++appLoadGeneration;
    const r=await fetch(A+'/applications',{headers:H()});
    const d=await r.json();
    if(generation!==appLoadGeneration||!r.ok)return;

    const source=Array.isArray(d.applications)?d.applications:[];
    const unique=[];const seen=new Set();
    for(const app of source){
      const id=Number(app?.id);
      const key=Number.isInteger(id)&&id>0
        ?'id:'+id
        :'fallback:'+String(app?.company||'')+'|'+String(app?.role||'')+'|'+String(app?.status||'')+'|'+String(app?.applied_date||'');
      if(seen.has(key))continue;
      seen.add(key);unique.push(app);
    }

    const fragment=document.createDocumentFragment();
    unique.forEach(app=>{
      const row=document.createElement('div');row.className='record-item';
      row.dataset.applicationId=String(app.id||'');
      const main=document.createElement('div');main.className='record-main';
      const title=document.createElement('strong');title.textContent=app.company||(lang==='ar'?'شركة غير محددة':'Entreprise non renseignée');
      const meta=document.createElement('div');meta.className='muted';meta.textContent=[app.role,app.status,app.applied_date].filter(Boolean).join(' — ');
      main.append(title,meta);
      if(app.notes){const notes=document.createElement('div');notes.className='muted';notes.textContent=app.notes;main.appendChild(notes)}
      const actions=document.createElement('div');actions.className='record-actions';
      actions.append(
        recordButton(lang==='ar'?'تعديل':'Modifier',()=>window.loadApplicationIntoForm(app)),
        recordButton(lang==='ar'?'حذف':'Supprimer',()=>window.deleteApplicationFinal(app.id),'record-delete')
      );
      row.append(main,actions);fragment.appendChild(row);
    });
    box.replaceChildren(fragment);
    if(typeof updateApplicationMode==='function')updateApplicationMode();
  };

  loadApps=window.loadAppsFinal;
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Application list stability patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Stabilized saved-application rendering and deduplicated concurrent loads.');
