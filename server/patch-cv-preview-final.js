import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'CV_FINAL_RENDERER_V20_2';

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
  if(newBtn)newBtn.textContent=lang==='ar'?'سيرة ذاتية جديدة':'Nouveau CV';
  if(!el)return;
  el.textContent=activeCvId
    ?(lang==='ar'?'وضع التعديل — CV #'+activeCvId:'Mode modification — CV #'+activeCvId)
    :(lang==='ar'?'وضع إنشاء سيرة جديدة':'Mode nouveau CV');
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
  document.getElementById('cvTitle')?.scrollIntoView({behavior:'smooth',block:'center'});
}
window.newCvFinal=function(){
  activeCvId=null;
  ['cvTitle','cvRole','cvFullName','cvPhone','cvEmail','cvAddress','cvProfile','cvExperience','cvSkills','cvEducation','cvLanguages'].forEach(id=>cvSet(id,''));
  cvSet('cvTemplate','classic');
  cvEditStatus();
  window.updateCvPreview();
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
  if(box)box.replaceChildren();
  if(!token){cvEditStatus();return}
  const r=await fetch(A+'/cvs',{headers:H()});
  const d=await r.json();
  if(!r.ok)return;
  const cvs=Array.isArray(d.cvs)?d.cvs:[];
  if(box){
    cvs.forEach(cv=>{
      const row=document.createElement('div');
      row.style.display='flex';
      row.style.alignItems='center';
      row.style.gap='8px';
      row.style.flexWrap='wrap';
      row.style.padding='10px 0';
      row.style.borderBottom='1px solid #e5e7eb';

      const label=document.createElement('span');
      label.style.flex='1 1 260px';
      label.textContent=cv.title+(cv.target_role?' — '+cv.target_role:'');
      row.appendChild(label);

      if(cv.is_primary){
        const primary=document.createElement('span');
        primary.className='muted';
        primary.textContent=lang==='ar'?'الرئيسية':'Principal';
        row.appendChild(primary);
      }else{
        const primaryBtn=document.createElement('button');
        primaryBtn.type='button';
        primaryBtn.textContent=lang==='ar'?'اجعلها الرئيسية':'Définir principal';
        primaryBtn.onclick=()=>window.setPrimaryCvFinal(cv.id);
        row.appendChild(primaryBtn);
      }

      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.textContent=lang==='ar'?'تعديل':'Modifier';
      editBtn.onclick=()=>window.loadCvIntoForm(cv);
      row.appendChild(editBtn);

      const deleteBtn=document.createElement('button');
      deleteBtn.type='button';
      deleteBtn.textContent=lang==='ar'?'حذف':'Supprimer';
      deleteBtn.style.color='#991b1b';
      deleteBtn.onclick=()=>window.deleteCvFinal(cv.id);
      row.appendChild(deleteBtn);

      box.appendChild(row);
    });
  }
  cvEditStatus();
};

// Replace the old loader used by navigation and post-save refreshes.
loadCvs=window.loadCvsFinal;

document.addEventListener('input',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
document.addEventListener('change',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
window.addEventListener('pageshow',()=>setTimeout(()=>{window.updateCvPreview();cvEditStatus()},0));
setTimeout(()=>{window.updateCvPreview();cvEditStatus()},100);
`;

// Never inject the final renderer twice if patch:public is run repeatedly.
if (!html.includes(marker)) {
  html = html.replace('</script></body>', finalRenderer + '</script></body>');
}

// Robustly rebind every remaining CV save call after all other public patches have run.
html = html.replaceAll('onclick="saveCv()"','onclick="saveCvFinal()"');

// Add explicit save/new actions and a visible edit-mode indicator once.
if (!html.includes('id="cvEditStatus"')) {
  html = html.replace(
    '<button class="primary" data-i18n="save" onclick="saveCvFinal()">Enregistrer</button>',
    '<button class="primary" data-i18n="save" onclick="saveCvFinal()">Enregistrer</button><button type="button" id="newCvButton" onclick="newCvFinal()">Nouveau CV</button><span id="cvEditStatus" class="muted" style="margin-inline-start:10px"></span>'
  );
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied clean CV edit flow, list actions and idempotent final renderer.');
}
