import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'APPLICATION_LIST_I18N_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// APPLICATION_LIST_I18N_V20_2_9
function localizedApplicationStatus(status){
  const keyByValue={
    'Envoyée':'sent',
    'Entretien':'interview',
    'Relance':'followup',
    'Refus':'rejected',
    'Acceptée':'accepted'
  };
  const key=keyByValue[String(status||'')];
  return key&&T[lang]&&T[lang][key]?T[lang][key]:String(status||'');
}
function localizedApplicationDate(value){
  const raw=String(value||'').trim();
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[3]+'/'+m[2]+'/'+m[1]:raw;
}
window.loadAppsFinal=async function(){
  const box=document.getElementById('appList');if(!box||!token)return;
  box.replaceChildren();
  const r=await fetch(A+'/applications',{headers:H()}),d=await r.json();if(!r.ok)return;
  (Array.isArray(d.applications)?d.applications:[]).forEach(app=>{
    const row=document.createElement('div');row.className='record-item';
    const main=document.createElement('div');main.className='record-main';
    const title=document.createElement('strong');title.textContent=app.company||(lang==='ar'?'شركة غير محددة':'Entreprise non renseignée');
    const meta=document.createElement('div');meta.className='muted';
    meta.textContent=[app.role,localizedApplicationStatus(app.status),localizedApplicationDate(app.applied_date)].filter(Boolean).join(' — ');
    main.append(title,meta);
    if(app.notes){const notes=document.createElement('div');notes.className='muted';notes.textContent=app.notes;main.appendChild(notes)}
    const actions=document.createElement('div');actions.className='record-actions';
    actions.append(
      recordButton(lang==='ar'?'تعديل':'Modifier',()=>window.loadApplicationIntoForm(app)),
      recordButton(lang==='ar'?'حذف':'Supprimer',()=>window.deleteApplicationFinal(app.id),'record-delete')
    );
    row.append(main,actions);box.appendChild(row);
  });
  updateApplicationMode();
};
loadApps=window.loadAppsFinal;
setTimeout(()=>{if(document.getElementById('appList'))window.loadAppsFinal().catch(()=>{});},180);
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied localized application list status and date.');
}
