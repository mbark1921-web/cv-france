import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'APPLICATION_EDIT_V20_2_1';

const patch = String.raw`
// APPLICATION_EDIT_V20_2_1
let activeApplicationId=null;
function clearApplicationForm(){
  activeApplicationId=null;
  ['appCompany','appRole','appNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const status=document.getElementById('appStatus');if(status)status.value=lang==='ar'?'Envoyée':'Envoyée';
  const date=document.getElementById('appDate');if(date)date.value='';
  if(typeof prefillPrimaryWorkflow==='function')prefillPrimaryWorkflow('apps');
  updateApplicationMode();
}
function updateApplicationMode(){
  const status=document.getElementById('appEditStatus');
  if(status)status.textContent=activeApplicationId
    ?(lang==='ar'?'تعديل طلب العمل رقم '+activeApplicationId:'Modification de la candidature #'+activeApplicationId)
    :(lang==='ar'?'طلب عمل جديد':'Nouvelle candidature');
}
window.loadApplicationIntoForm=function(app){
  if(!app)return;
  activeApplicationId=Number(app.id)||null;
  document.getElementById('appCompany').value=app.company||'';
  document.getElementById('appRole').value=app.role||'';
  document.getElementById('appStatus').value=app.status||'Envoyée';
  const date=document.getElementById('appDate');if(date)date.value=app.applied_date||'';
  const notes=document.getElementById('appNotes');if(notes)notes.value=app.notes||'';
  updateApplicationMode();
  document.getElementById('appCompany')?.scrollIntoView({behavior:'smooth',block:'center'});
};
window.saveApplicationFinal=async function(){
  const body={
    company:v('appCompany'),
    role:v('appRole'),
    status:v('appStatus'),
    applied_date:v('appDate'),
    notes:v('appNotes')
  };
  const editing=Number.isInteger(activeApplicationId)&&activeApplicationId>0;
  const r=await fetch(editing?A+'/applications/'+activeApplicationId:A+'/applications',{
    method:editing?'PUT':'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  const d=await r.json();
  if(!r.ok)return note(d.error||T[lang].serverError,true);
  if(!editing&&d.id)activeApplicationId=Number(d.id);
  note(editing?(lang==='ar'?'تم تحديث طلب العمل':'Candidature mise à jour'):T[lang].appSaved);
  updateApplicationMode();
  await window.loadAppsFinal();
  loadDashboard();
};
const oldLoadAppsFinal=window.loadAppsFinal;
window.loadAppsFinal=async function(){
  const box=document.getElementById('appList');
  if(!box||!token)return;
  box.replaceChildren();
  const r=await fetch(A+'/applications',{headers:H()});
  const d=await r.json();
  if(!r.ok)return;
  (Array.isArray(d.applications)?d.applications:[]).forEach(app=>{
    const row=document.createElement('div');row.className='record-item';
    const main=document.createElement('div');main.className='record-main';
    const title=document.createElement('strong');title.textContent=app.company|| (lang==='ar'?'شركة غير محددة':'Entreprise non renseignée');
    const metaParts=[app.role,app.status,app.applied_date].filter(Boolean);
    const meta=document.createElement('div');meta.className='muted';meta.textContent=metaParts.join(' — ');
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
saveApp=window.saveApplicationFinal;
setTimeout(()=>updateApplicationMode(),120);
`;

if(!html.includes(marker))html=html.replace('</script></body>',patch+'</script></body>');

if(!html.includes('id="appDate"')){
  html=html.replace(
    '<select id="appStatus"><option data-i18n-option="sent">Envoyée</option><option data-i18n-option="interview">Entretien</option><option data-i18n-option="followup">Relance</option><option data-i18n-option="rejected">Refus</option><option data-i18n-option="accepted">Acceptée</option></select><button class="primary" data-i18n="add" onclick="saveApp()">Ajouter</button><div id="appList"></div>',
    '<select id="appStatus"><option data-i18n-option="sent">Envoyée</option><option data-i18n-option="interview">Entretien</option><option data-i18n-option="followup">Relance</option><option data-i18n-option="rejected">Refus</option><option data-i18n-option="accepted">Acceptée</option></select><input id="appDate" type="date"><textarea id="appNotes" placeholder="Notes"></textarea><div class="record-toolbar"><button class="primary" data-i18n="add" onclick="saveApplicationFinal()">Ajouter</button><button type="button" id="newApplicationButton" onclick="clearApplicationForm()">Nouvelle candidature</button><span id="appEditStatus" class="record-status"></span></div><div id="appList"></div>'
  );
}

html=html.replaceAll('onclick="saveApp()"','onclick="saveApplicationFinal()"');

if(html!==before){fs.writeFileSync(indexPath,html,'utf8');console.log('Applied application edit workflow.');}
