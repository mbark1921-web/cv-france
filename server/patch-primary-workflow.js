import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'PRIMARY_CV_WORKFLOW_V20_2';

if (!html.includes(marker)) {
  const integration = String.raw`
// PRIMARY_CV_WORKFLOW_V20_2
function primaryCvFromList(cvs){
  if(!Array.isArray(cvs)||!cvs.length)return null;
  return cvs.find(cv=>cv&&cv.is_primary)||cvs[0]||null;
}
function fillRoleFromPrimary(cv){
  if(!cv)return;
  const role=String(cv.target_role||(cv.data&&cv.data.jobTitle)||'').trim();
  if(!role)return;
  const interview=document.getElementById('interviewRole');
  const letter=document.getElementById('letterRole');
  const app=document.getElementById('appRole');
  if(interview&&!interview.value.trim())interview.value=role;
  if(letter&&!letter.value.trim())letter.value=role;
  if(app&&!app.value.trim())app.value=role;
}
window.preparePrimaryWorkflow=async function(target){
  if(!token)return;
  try{
    const r=await fetch(A+'/cvs',{headers:H()});
    const d=await r.json();
    if(!r.ok)return;
    const cvs=Array.isArray(d.cvs)?d.cvs:[];
    const primary=primaryCvFromList(cvs);
    if(target==='ats'){
      atsCvs=cvs;
      const sel=document.getElementById('atsCv');
      if(sel){
        const previous=sel.value;
        sel.textContent='';
        const first=document.createElement('option');
        first.value='';
        first.dataset.i18nOption='chooseCv';
        first.textContent=T[lang].chooseCv;
        sel.appendChild(first);
        cvs.forEach(cv=>{
          const o=document.createElement('option');
          o.value=String(cv.id);
          o.textContent=cv.title+(cv.target_role?' — '+cv.target_role:'');
          sel.appendChild(o);
        });
        if(primary)sel.value=String(primary.id);
        else if(cvs.some(x=>String(x.id)===previous))sel.value=previous;
      }
    }
    fillRoleFromPrimary(primary);
  }catch{}
};
const showBeforePrimaryWorkflow=show;
show=function(id){
  showBeforePrimaryWorkflow(id);
  if(['ats','letters','apps','interview'].includes(id))setTimeout(()=>window.preparePrimaryWorkflow(id),0);
};
setTimeout(()=>window.preparePrimaryWorkflow('startup'),120);
`;
  html = html.replace('</script></body>', integration + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied primary CV workflow integration.');
}
