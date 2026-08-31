import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'RECORD_MANAGEMENT_V20_2';

const patch = String.raw`
// RECORD_MANAGEMENT_V20_2
let activeLetterId=null;
function recordButton(label,handler,cls=''){
  const b=document.createElement('button');
  b.type='button';
  b.textContent=label;
  if(cls)b.className=cls;
  b.onclick=handler;
  return b;
}
function clearLetterForm(){
  activeLetterId=null;
  ['letterTitle','letterCompany','letterContent'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const role=document.getElementById('letterRole');
  if(role)role.value='';
  if(typeof prefillPrimaryWorkflow==='function')prefillPrimaryWorkflow('letters');
  updateLetterMode();
}
function updateLetterMode(){
  const status=document.getElementById('letterEditStatus');
  if(status)status.textContent=activeLetterId
    ?(lang==='ar'?'تعديل الرسالة رقم '+activeLetterId:'Modification de la lettre #'+activeLetterId)
    :(lang==='ar'?'رسالة جديدة':'Nouvelle lettre');
}
window.loadLetterIntoForm=function(letter){
  if(!letter)return;
  activeLetterId=Number(letter.id)||null;
  document.getElementById('letterTitle').value=letter.title||'';
  document.getElementById('letterCompany').value=letter.company||'';
  document.getElementById('letterRole').value=letter.target_role||'';
  document.getElementById('letterContent').value=letter.content||'';
  updateLetterMode();
  document.getElementById('letterTitle')?.scrollIntoView({behavior:'smooth',block:'center'});
};
window.saveLetterFinal=async function(){
  const body={
    title:v('letterTitle')||(lang==='ar'?'رسالة التقديم':'Lettre'),
    company:v('letterCompany'),
    targetRole:v('letterRole'),
    content:v('letterContent')
  };
  const editing=Number.isInteger(activeLetterId)&&activeLetterId>0;
  const r=await fetch(editing?A+'/letters/'+activeLetterId:A+'/letters',{
    method:editing?'PUT':'POST',
    headers:{...H(),'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const d=await r.json();
  if(!r.ok)return note(d.error||T[lang].serverError,true);
  if(!editing&&d.id)activeLetterId=Number(d.id);
  note(editing?(lang==='ar'?'تم تحديث الرسالة':'Lettre mise à jour'):T[lang].letterSaved);
  updateLetterMode();
  await window.loadLettersFinal();
  loadDashboard();
};
window.deleteLetterFinal=async function(id){
  if(!confirm(lang==='ar'?'حذف هذه الرسالة نهائياً؟':'Supprimer définitivement cette lettre ?'))return;
  const r=await fetch(A+'/letters/'+id,{method:'DELETE',headers:H()});
  const d=await r.json();
  if(!r.ok)return note(d.error||T[lang].serverError,true);
  if(Number(activeLetterId)===Number(id))clearLetterForm();
  note(lang==='ar'?'تم حذف الرسالة':'Lettre supprimée');
  await window.loadLettersFinal();
  loadDashboard();
};
window.loadLettersFinal=async function(){
  const box=document.getElementById('letterList');
  if(!box||!token)return;
  box.replaceChildren();
  const r=await fetch(A+'/letters',{headers:H()});
  const d=await r.json();
  if(!r.ok)return;
  (Array.isArray(d.letters)?d.letters:[]).forEach(letter=>{
    const row=document.createElement('div');
    row.className='record-item';
    const main=document.createElement('div');main.className='record-main';
    const title=document.createElement('strong');title.textContent=letter.title||'Lettre';
    const meta=document.createElement('div');meta.className='muted';meta.textContent=[letter.company,letter.target_role].filter(Boolean).join(' — ');
    main.append(title,meta);
    const actions=document.createElement('div');actions.className='record-actions';
    actions.append(
      recordButton(lang==='ar'?'تعديل':'Modifier',()=>window.loadLetterIntoForm(letter)),
      recordButton(lang==='ar'?'حذف':'Supprimer',()=>window.deleteLetterFinal(letter.id),'record-delete')
    );
    row.append(main,actions);box.appendChild(row);
  });
  updateLetterMode();
};
window.deleteApplicationFinal=async function(id){
  if(!confirm(lang==='ar'?'حذف طلب العمل نهائياً؟':'Supprimer définitivement cette candidature ?'))return;
  const r=await fetch(A+'/applications/'+id,{method:'DELETE',headers:H()});
  const d=await r.json();
  if(!r.ok)return note(d.error||T[lang].serverError,true);
  note(lang==='ar'?'تم حذف طلب العمل':'Candidature supprimée');
  await window.loadAppsFinal();
  loadDashboard();
};
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
    const meta=document.createElement('div');meta.className='muted';meta.textContent=[app.role,app.status].filter(Boolean).join(' — ');
    main.append(title,meta);
    const actions=document.createElement('div');actions.className='record-actions';
    actions.append(recordButton(lang==='ar'?'حذف':'Supprimer',()=>window.deleteApplicationFinal(app.id),'record-delete'));
    row.append(main,actions);box.appendChild(row);
  });
};
loadLetters=window.loadLettersFinal;
loadApps=window.loadAppsFinal;
saveLetter=window.saveLetterFinal;
setTimeout(()=>updateLetterMode(),100);
`;

if(!html.includes(marker)){
  html=html.replace('</script></body>',patch+'</script></body>');
}

if(!html.includes('id="newLetterButton"')){
  html=html.replace(
    '<button class="primary" data-i18n="save" onclick="saveLetter()">Enregistrer</button><div id="letterList"></div>',
    '<div class="record-toolbar"><button class="primary" data-i18n="save" onclick="saveLetterFinal()">Enregistrer</button><button type="button" id="newLetterButton" onclick="clearLetterForm()">Nouvelle lettre</button><span id="letterEditStatus" class="record-status"></span></div><div id="letterList"></div>'
  );
}

if(!html.includes('RECORD_MANAGEMENT_STYLES_V20_2')){
  const styles=String.raw`/* RECORD_MANAGEMENT_STYLES_V20_2 */
.record-toolbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:12px}.record-status{padding:7px 10px;border-radius:999px;background:#f3f4f6;color:#475467;font-size:13px;font-weight:700}.record-item{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 0;border-top:1px solid #e5e7eb}.record-main{flex:1 1 280px;min-width:0}.record-actions{display:flex;gap:7px;flex-wrap:wrap}.record-actions button{border:1px solid #d0d5dd;background:#fff;color:#344054;padding:8px 10px}.record-actions .record-delete{color:#b42318;border-color:#fecdca}.record-actions .record-delete:hover{background:#fef3f2}@media(max-width:640px){.record-item{align-items:stretch}.record-main,.record-actions{width:100%}.record-actions button{flex:1 1 120px}}
`;
  html=html.replace('</style>',styles+'</style>');
}

html=html.replaceAll('onclick="saveLetter()"','onclick="saveLetterFinal()"');

if(html!==before){
  fs.writeFileSync(indexPath,html,'utf8');
  console.log('Applied record management actions for letters and applications.');
}
