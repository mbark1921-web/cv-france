import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

const finalRenderer = String.raw`
// Final authoritative CV preview renderer. This runs after all other public patches.
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
  section(T[lang].previewEducation|| (lang==='ar'?'الدراسة والتكوين':'Formation'),education);
  section(T[lang].previewLanguages|| (lang==='ar'?'اللغات':'Langues'),languages);

  if(!(name||role||email||phone||address||profile||experience||skills||education||languages)){
    const p=document.createElement('p');
    p.className='empty';
    p.textContent=T[lang].previewEmpty;
    box.appendChild(p);
  }
};

// Final authoritative CV saver. Persist every field shown by the professional CV form.
window.saveCv=async function(){
  const get=id=>{const el=document.getElementById(id);return el?String(el.value||'').trim():''};
  const body={
    title:get('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV'),
    targetRole:get('cvRole'),
    data:{
      template:get('cvTemplate')||'classic',
      fullName:get('cvFullName'),
      phone:get('cvPhone'),
      email:get('cvEmail'),
      address:get('cvAddress'),
      jobTitle:get('cvRole'),
      profile:get('cvProfile'),
      experience:get('cvExperience'),
      skills:get('cvSkills'),
      education:get('cvEducation'),
      languages:get('cvLanguages')
    }
  };
  const r=await fetch(A+'/cvs',{method:'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok)return note(d.error,true);
  note(T[lang].cvSaved);
  loadCvs();
  loadDashboard();
};

document.addEventListener('input',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
document.addEventListener('change',e=>{if(e.target&&String(e.target.id||'').startsWith('cv'))window.updateCvPreview()});
window.addEventListener('pageshow',()=>setTimeout(()=>window.updateCvPreview(),0));
setTimeout(()=>window.updateCvPreview(),100);
`;

html = html.replace('</script></body>', finalRenderer + '</script></body>');

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied final authoritative CV preview renderer and saver.');
}
