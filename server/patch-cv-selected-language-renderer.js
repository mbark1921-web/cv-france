import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_SELECTED_LANGUAGE_RENDERER_V20_2_9';

if(!html.includes(marker)){
  html=html.replace('</body></html>',`<script>/* ${marker} */
(function(){
  function selectedCvLang(){
    const sel=document.getElementById('cvLanguage');
    return sel&&sel.value==='ar'?'ar':'fr';
  }
  function get(id){const el=document.getElementById(id);return el?String(el.value||'').trim():''}
  function renderSelectedLanguage(){
    const box=document.getElementById('cvPreview');
    if(!box)return;
    const cvLang=selectedCvLang();
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
    box.lang=cvLang;
    box.dir=cvLang==='ar'?'rtl':'ltr';
    box.style.direction=cvLang==='ar'?'rtl':'ltr';
    box.style.textAlign=cvLang==='ar'?'right':'left';
    box.replaceChildren();

    const h1=document.createElement('h1');
    h1.textContent=name||(cvLang==='ar'?'سيرتي الذاتية':'Mon CV');
    h1.style.textAlign=cvLang==='ar'?'right':'left';
    h1.style.direction=cvLang==='ar'?'rtl':'ltr';
    box.appendChild(h1);

    if(role){
      const p=document.createElement('p');
      p.style.fontWeight='700';
      p.style.textAlign=cvLang==='ar'?'right':'left';
      p.style.direction=cvLang==='ar'?'rtl':'ltr';
      p.textContent=role;
      box.appendChild(p);
    }

    if(email||phone||address){
      const row=document.createElement('p');
      row.className='muted cv-contact';
      row.style.display='flex';
      row.style.flexWrap='wrap';
      row.style.gap='.35em';
      row.style.justifyContent=cvLang==='ar'?'flex-end':'flex-start';
      row.style.direction='ltr';
      row.style.textAlign=cvLang==='ar'?'right':'left';
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
      add(address,cvLang==='ar'?'rtl':'ltr');
      box.appendChild(row);
    }

    const titles=cvLang==='ar'
      ?{profile:'الملف المهني',experience:'الخبرات',skills:'المهارات',education:'الدراسة / التكوين',languages:'اللغات'}
      :{profile:'Profil professionnel',experience:'Expériences',skills:'Compétences',education:'Formation / Études',languages:'Langues'};
    const section=(title,text)=>{
      if(!text)return;
      const h=document.createElement('h2');
      h.textContent=title;
      h.style.textAlign=cvLang==='ar'?'right':'left';
      h.style.direction=cvLang==='ar'?'rtl':'ltr';
      const p=document.createElement('p');
      p.textContent=text;
      p.style.textAlign=cvLang==='ar'?'right':'left';
      p.style.direction=cvLang==='ar'?'rtl':'ltr';
      box.append(h,p);
    };
    section(titles.profile,profile);
    section(titles.experience,experience);
    section(titles.skills,skills);
    section(titles.education,education);
    section(titles.languages,languages);

    if(!(name||role||email||phone||address||profile||experience||skills||education||languages)){
      const p=document.createElement('p');
      p.className='empty';
      p.textContent=cvLang==='ar'?'ابدأ بملء السيرة الذاتية لتظهر المعاينة.':'Commencez à remplir le CV pour voir l’aperçu.';
      p.style.textAlign=cvLang==='ar'?'right':'left';
      p.style.direction=cvLang==='ar'?'rtl':'ltr';
      box.appendChild(p);
    }
  }

  window.updateCvPreview=renderSelectedLanguage;
  window.printCvPreview=function(){renderSelectedLanguage();requestAnimationFrame(()=>window.print())};
  document.addEventListener('input',e=>{if(e.target&&e.target.closest&&e.target.closest('#cv'))renderSelectedLanguage()});
  document.addEventListener('change',e=>{if(e.target&&e.target.closest&&e.target.closest('#cv'))renderSelectedLanguage()});
  window.addEventListener('pageshow',()=>setTimeout(renderSelectedLanguage,0));
  setTimeout(renderSelectedLanguage,0);
})();
</script></body></html>`);
  fs.writeFileSync(file,html,'utf8');
  console.log('Applied authoritative selected-CV-language renderer');
}
