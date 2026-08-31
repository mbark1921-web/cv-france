import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'CV_FINAL_RENDERER_V20_2';
const styleMarker = 'CV_FINAL_POLISH_STYLES_V20_2';

const finalStyles = String.raw`
/* CV_FINAL_POLISH_STYLES_V20_2 */
#cv .card{padding:24px}
.cv-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:4px 0 8px}
.cv-actions .primary{min-width:132px}
.cv-edit-status{display:inline-flex;align-items:center;min-height:34px;padding:6px 10px;border-radius:999px;background:#f3f4f6;color:#475467;font-size:13px;font-weight:700}
.cv-edit-status.editing{background:#fff7ed;color:#9a3412}
.cv-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:22px;padding-top:18px;border-top:1px solid #e5e7eb}
.cv-list-head h4{margin:0;font-size:16px}
.cv-list-count{display:inline-flex;align-items:center;justify-content:center;min-width:34px;padding:5px 9px;border-radius:999px;background:#eef2f7;color:#344054;font-size:13px;font-weight:800}
.cv-list{display:grid;gap:10px;margin-top:10px}
.cv-item{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;transition:box-shadow .15s ease,border-color .15s ease}
.cv-item:hover{border-color:#cfd4dc;box-shadow:0 5px 16px rgba(17,24,39,.06)}
.cv-item.active{border-color:#98a2b3;background:#f9fafb}
.cv-item-main{flex:1 1 280px;min-width:0}
.cv-item-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:800;color:#18212f;overflow-wrap:anywhere}
.cv-item-role{margin-top:4px;color:#667085;font-size:14px;overflow-wrap:anywhere}
.cv-primary-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:800}
.cv-item-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.cv-item-actions button{padding:8px 10px;border:1px solid #d0d5dd;background:#fff;color:#344054;font-size:13px}
.cv-item-actions button:hover{background:#f9fafb}
.cv-item-actions .cv-delete{color:#b42318;border-color:#fecdca;background:#fff}
.cv-item-actions .cv-delete:hover{background:#fef3f2}
.cv-empty-list{padding:18px;border:1px dashed #d0d5dd;border-radius:14px;color:#667085;text-align:center;background:#fcfcfd}
#cvPreview{position:relative}
html[dir='rtl'] #cvPreview{text-align:right}
#cvPreview[dir='rtl'] h1,#cvPreview[dir='rtl'] h2,#cvPreview[dir='rtl'] p{text-align:right}
@media(min-width:900px){.template-row>div:last-child{position:sticky;top:16px;align-self:start}}
@media(max-width:640px){#cv .card{padding:16px}.cv-actions{align-items:stretch}.cv-actions button{flex:1 1 145px}.cv-edit-status{width:100%;justify-content:center}.cv-list-head{align-items:center}.cv-item{align-items:stretch}.cv-item-main{flex-basis:100%}.cv-item-actions{width:100%}.cv-item-actions button{flex:1 1 120px}}
html[dir='rtl'] .cv-item-actions{direction:rtl}
@media print{
  @page{size:A4 portrait;margin:12mm}
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  body *{visibility:hidden!important}
  #cvPreview,#cvPreview *{visibility:visible!important}
  #cvPreview{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;min-height:0!important;margin:0!important;padding:0!important;box-sizing:border-box!important;box-shadow:none!important;background:#fff!important;overflow:visible!important;break-inside:auto!important;page-break-inside:auto!important}
  html[dir='rtl'] #cvPreview{right:0!important;left:auto!important}
  #cvPreview.classic{border-top:6px solid #111827!important;padding-top:12mm!important}
  #cvPreview.modern{border-left:10px solid #111827!important;padding:12mm!important}
  html[dir='rtl'] #cvPreview.modern{border-left:0!important;border-right:10px solid #111827!important}
  #cvPreview.elegant{border:0!important;padding:10mm!important}
  #cvPreview h1,#cvPreview h2,#cvPreview p{break-inside:avoid;page-break-inside:avoid}
  #cvPreview p{orphans:3;widows:3}
}
`;

const finalRenderer = String.raw`
// CV_FINAL_RENDERER_V20_2
// Final authoritative CV preview and edit renderer.
window.updateCvPreview=function(){
  const box=document.getElementById('cvPreview');
  if(!box)return;
  const get=id=>{const el=document.getElementById(id);return el?String(el.value||'').trim():''};
  const template=get('cvTemplate')||'classic';
  const name=get('cvFullName');
  const role=get('cvRole');
  const email=get('cvEmail');
  const phone=get('cvPhone');
  const address=get('cvAddress');
  const profile=get('cvProfile');
  const experience=get('cvExperience');
  const skills=get('cvSkills');
  const education=get('cvEducation');
  const languages=get('cvLanguages');

  box.className='cv-preview '+template;
  box.lang=lang==='ar'?'ar':'fr';
  box.dir=lang==='ar'?'rtl':'ltr';
  box.replaceChildren();

  const h1=document.createElement('h1');
  h1.textContent=name||(lang==='ar'?'سيرتي الذاتية':'Mon CV');
  box.appendChild(h1);

  if(role){
    const p=document.createElement('p');
    p.style.fontWeight='700';
    p.textContent=role;
    box.appendChild(p);
  }

  if(email||phone||address){
    const row=document.createElement('p');
    row.className='muted cv-contact';
    row.style.display='flex';
    row.style.flexWrap='wrap';
    row.style.gap='.35em';
    row.style.direction='ltr';
    const add=(text,dir)=>{
      if(!text)return;
      if(row.childNodes.length){const sep=document.createElement('span');sep.textContent=' · ';row.appendChild(sep)}
      const span=document.createElement('span');
      span.textContent=text;
      span.dir=dir;
      span.style.direction=dir;
      span.style.unicodeBidi='isolate';
      row.appendChild(span);
    };
    add(email,'ltr');
    add(phone,'ltr');
    add(address,lang==='ar'?'rtl':'ltr');
    box.appendChild(row);
  }

  const section=(title,text)=>{
    if(!text)return;
    const h=document.createElement('h2');
    h.textContent=title;
    const p=document.createElement('p');
    p.textContent=text;
    box.appendChild(h);
    box.appendChild(p);
  };

  section(T[lang].previewProfile,profile);
  section(T[lang].previewExperience,experience);
  section(T[lang].previewSkills,skills);
  section(T[lang].previewEducation||(lang==='ar'?'الدراسة والتكوين':'Formation'),education);
  section(T[lang].previewLanguages||(lang==='ar'?'اللغات':'Langues'),languages);

  if(!(name||role||email||phone||address||profile||experience||skills||education||languages)){
    const p=document.createElement('p');
    p.className='empty';
    p.textContent=T[lang].previewEmpty;
    box.appendChild(p);
  }
};

let activeCvId=null;
function cvGet(id){const el=document.getElementById(id);return el?String(el.value||'').trim():''}
function cvSet(id,value){const el=document.getElementById(id);if(el)el.value=value||''}
function cvEditStatus(){
  const el=document.getElementById('cvEditStatus');
  const newBtn=document.getElementById('newCvButton');
  const listTitle=document.getElementById('cvListTitle');
  if(newBtn)newBtn.textContent=lang==='ar'?'سيرة ذاتية جديدة':'Nouveau CV';
  if(listTitle)listTitle.textContent=lang==='ar'?'السير الذاتية المحفوظة':'CV enregistrés';
  if(!el)return;
  el.classList.toggle('editing',Boolean(activeCvId));
  el.textContent=activeCvId
    ?(lang==='ar'?'تعديل السيرة رقم '+activeCvId:'Modification du CV #'+activeCvId)
    :(lang==='ar'?'إنشاء سيرة ذاتية جديدة':'Création d’un nouveau CV');
}
function cvBody(){return {
  title:cvGet('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV'),
  targetRole:cvGet('cvRole'),
  data:{
    template:cvGet('cvTemplate')||'classic',
    fullName:cvGet('cvFullName'),
    phone:cvGet('cvPhone'),
    email:cvGet('cvEmail'),
    address:cvGet('cvAddress'),
    jobTitle:cvGet('cvRole'),
    profile:cvGet('cvProfile'),
    experience:cvGet('cvExperience'),
    skills:cvGet('cvSkills'),
    education:cvGet('cvEducation'),
    languages:cvGet('cvLanguages')
  }
}}
window.loadCvIntoForm=function(cv){
  if(!cv)return;
  const d=cv.data||{};
  activeCvId=Number(cv.id)||null;
  cvSet('cvTitle',cv.title);
  cvSet('cvRole',cv.target_role||d.jobTitle);
  cvSet('cvFullName',d.fullName);
  cvSet('cvPhone',d.phone);
  cvSet('cvEmail',d.email);
  cvSet('cvAddress',d.address);
  cvSet('cvProfile',d.profile);
  cvSet('cvExperience',d.experience);
  cvSet('cvSkills',d.skills);
  cvSet('cvEducation',d.education);
  cvSet('cvLanguages',d.languages);
  cvSet('cvTemplate',d.template||'classic');
  cvEditStatus();
  window.updateCvPreview();
  window.loadCvsFinal();
  document.getElementById('cvTitle')?.scrollIntoView({behavior:'smooth',block:'center'});
}
window.newCvFinal=function(){
  activeCvId=null;
  ['cvTitle','cvRole','cvFullName','cvPhone','cvEmail','cvAddress','cvProfile','cvExperience','cvSkills','cvEducation','cvLanguages'].forEach(id=>cvSet(id,''));
  cvSet('cvTemplate','classic');
  cvEditStatus();
  window.updateCvPreview();
  window.loadCvsFinal();
  document.getElementById('cvTitle')?.focus();
}
window.saveCvFinal=async function(){
  const body=cvBody();
  const editing=Number.isInteger(activeCvId)&&activeCvId>0;
  const url=editing?A+'/cvs/'+activeCvId:A+'/cvs';
  const method=editing?'PUT':'POST';
  const r=await fetch(url,{method,headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok)return note(d.error||'Erreur',true);
  if(!editing&&d.id)activeCvId=Number(d.id);
  cvEditStatus();
  note(editing
    ?(lang==='ar'?'تم تحديث السيرة الذاتية':'CV mis à jour')
    :T[lang].cvSaved);
  await window.loadCvsFinal();
  loadDashboard();
};
window.setPrimaryCvFinal=async function(id){
  const r=await fetch(A+'/cvs/'+id+'/primary',{method:'POST',headers:H()});
  const d=await r.json();
  if(!r.ok)return note(d.error||'Erreur',true);
  note(lang==='ar'?'تم تعيين السيرة الرئيسية':'CV principal défini');
  await window.loadCvsFinal();
};
window.deleteCvFinal=async function(id){
  const ok=confirm(lang==='ar'?'حذف هذه السيرة الذاتية نهائياً؟':'Supprimer définitivement ce CV ?');
  if(!ok)return;
  const r=await fetch(A+'/cvs/'+id,{method:'DELETE',headers:H()});
  const d=await r.json();
  if(!r.ok)return note(d.error||'Erreur',true);
  if(Number(activeCvId)===Number(id))window.newCvFinal();
  note(lang==='ar'?'تم حذف السيرة الذاتية':'CV supprimé');
  await window.loadCvsFinal();
  loadDashboard();
};
window.loadCvsFinal=async function(){
  const box=document.getElementById('cvList');
  const count=document.getElementById('cvListCount');
  if(box)box.replaceChildren();
  if(!token){if(count)count.textContent='0';cvEditStatus();return}
  const r=await fetch(A+'/cvs',{headers:H()});
  const d=await r.json();
  if(!r.ok)return;
  const cvs=Array.isArray(d.cvs)?d.cvs:[];
  if(count)count.textContent=String(cvs.length);
  if(box&&cvs.length===0){
    const empty=document.createElement('div');
    empty.className='cv-empty-list';
    empty.textContent=lang==='ar'?'لم تحفظ أي سيرة ذاتية بعد.':'Aucun CV enregistré pour le moment.';
    box.appendChild(empty);
  }
  if(box){
    cvs.forEach(cv=>{
      const row=document.createElement('div');
      row.className='cv-item'+(Number(activeCvId)===Number(cv.id)?' active':'');

      const main=document.createElement('div');
      main.className='cv-item-main';
      const title=document.createElement('div');
      title.className='cv-item-title';
      const titleText=document.createElement('span');
      titleText.textContent=cv.title||(lang==='ar'?'سيرة بدون عنوان':'CV sans titre');
      title.appendChild(titleText);
      if(cv.is_primary){
        const primary=document.createElement('span');
        primary.className='cv-primary-badge';
        primary.textContent=lang==='ar'?'الرئيسية':'Principal';
        title.appendChild(primary);
      }
      const role=document.createElement('div');
      role.className='cv-item-role';
      role.textContent=cv.target_role||(lang==='ar'?'بدون وظيفة محددة':'Poste non renseigné');
      main.appendChild(title);
      main.appendChild(role);
      row.appendChild(main);

      const actions=document.createElement('div');
      actions.className='cv-item-actions';
      if(!cv.is_primary){
        const primaryBtn=document.createElement('button');
        primaryBtn.type='button';
        primaryBtn.textContent=lang==='ar'?'اجعلها الرئيسية':'Définir principal';
        primaryBtn.onclick=()=>window.setPrimaryCvFinal(cv.id);
        actions.appendChild(primaryBtn);
      }

      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.textContent=lang==='ar'?'تعديل':'Modifier';
      editBtn.onclick=()=>window.loadCvIntoForm(cv);
      actions.appendChild(editBtn);

      const deleteBtn=document.createElement('button');
      deleteBtn.type='button';
      deleteBtn.className='cv-delete';
      deleteBtn.textContent=lang==='ar'?'حذف':'Supprimer';
      deleteBtn.onclick=()=>window.deleteCvFinal(cv.id);
      actions.appendChild(deleteBtn);

      row.appendChild(actions);
      box.appendChild(row);
    });
  }
  cvEditStatus();
};

loadCvs=window.loadCvsFinal;

document.addEventListener('input',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
document.addEventListener('change',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
window.addEventListener('pageshow',()=>setTimeout(()=>{window.updateCvPreview();cvEditStatus()},0));
setTimeout(()=>{window.updateCvPreview();cvEditStatus()},100);
`;

html = html.replace('<title>CV France v20</title>','<title>CV France v20.2</title>');
html = html.replace('<h2>CV France <small>v20 Staging</small></h2>','<h2>CV France <small>v20.2 Staging</small></h2>');

if (!html.includes(styleMarker)) {
  html = html.replace('</style>', finalStyles + '</style>');
}

if (!html.includes(marker)) {
  html = html.replace('</script></body>', finalRenderer + '</script></body>');
}

html = html.replaceAll('onclick="saveCv()"','onclick="saveCvFinal()"');

if (!html.includes('id="cvEditStatus"')) {
  html = html.replace(
    '<button class="primary" data-i18n="save" onclick="saveCvFinal()">Enregistrer</button>',
    '<div class="cv-actions"><button class="primary" data-i18n="save" onclick="saveCvFinal()">Enregistrer</button><button type="button" id="newCvButton" onclick="newCvFinal()">Nouveau CV</button><span id="cvEditStatus" class="cv-edit-status"></span></div>'
  );
}

if (!html.includes('id="cvListCount"')) {
  html = html.replace(
    '<div id="cvList"></div>',
    '<div class="cv-list-head"><h4 id="cvListTitle">CV enregistrés</h4><span id="cvListCount" class="cv-list-count">0</span></div><div id="cvList" class="cv-list"></div>'
  );
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied polished CV workspace, saved-list cards, RTL preview and print-safe CV output.');
}
