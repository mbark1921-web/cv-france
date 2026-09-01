import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'CV_LANG_RTL_PDF_FINAL_V20_2_9';

if (!html.includes(marker)) {
  html = html.replace(
    '</style>',
    `
/* ${marker}_STYLES */
#cvLanguageLabel,label[for="cvTemplate"]{display:block;margin-top:8px;margin-bottom:2px;font-weight:600}
#cvLanguage{margin-bottom:12px}
#cvPreview[dir="rtl"]{direction:rtl;text-align:right}
#cvPreview[dir="rtl"] h1,#cvPreview[dir="rtl"] h2,#cvPreview[dir="rtl"] p{text-align:right!important}
#cvPreview[dir="ltr"]{direction:ltr;text-align:left}
#cvPreview[dir="ltr"] h1,#cvPreview[dir="ltr"] h2,#cvPreview[dir="ltr"] p{text-align:left!important}
@media print{
  #cvPreview[dir="rtl"]{direction:rtl!important;text-align:right!important;right:0!important;left:auto!important}
  #cvPreview[dir="rtl"] h1,#cvPreview[dir="rtl"] h2,#cvPreview[dir="rtl"] p{text-align:right!important;direction:rtl!important}
  #cvPreview[dir="ltr"]{direction:ltr!important;text-align:left!important;left:0!important;right:auto!important}
  #cvPreview[dir="ltr"] h1,#cvPreview[dir="ltr"] h2,#cvPreview[dir="ltr"] p{text-align:left!important;direction:ltr!important}
}
</style>`
  );

  html = html.replace(
    '</body></html>',
    `<script>/* ${marker} */
(function(){
  function cvLang(){
    const sel=document.getElementById('cvLanguage');
    return sel&&sel.value==='ar'?'ar':'fr';
  }

  function localizeCvLanguageUi(){
    const label=document.getElementById('cvLanguageLabel');
    if(label)label.textContent=lang==='ar'?'لغة السيرة الذاتية':'Langue du CV';
    const sel=document.getElementById('cvLanguage');
    if(sel){
      const fr=sel.querySelector('option[value="fr"]');
      const ar=sel.querySelector('option[value="ar"]');
      if(fr)fr.textContent=lang==='ar'?'الفرنسية':'Français';
      if(ar)ar.textContent='العربية';
    }
    const templateLabel=document.querySelector('label[for="cvTemplate"]');
    if(templateLabel)templateLabel.textContent=lang==='ar'?'قالب السيرة الذاتية':'Modèle de CV';
  }

  function enforceCvLanguage(){
    const box=document.getElementById('cvPreview');
    if(!box)return;
    const l=cvLang();
    box.lang=l;
    box.dir=l==='ar'?'rtl':'ltr';
    box.style.direction=l==='ar'?'rtl':'ltr';
    box.style.textAlign=l==='ar'?'right':'left';

    const titles=l==='ar'
      ?['الملف المهني','الخبرات','المهارات','الدراسة والتكوين','اللغات']
      :['Profil professionnel','Expériences','Compétences','Formation / Études','Langues'];
    box.querySelectorAll('h2').forEach((h,i)=>{
      if(titles[i])h.textContent=titles[i];
      h.style.textAlign=l==='ar'?'right':'left';
      h.style.direction=l==='ar'?'rtl':'ltr';
    });
    box.querySelectorAll('h1,p').forEach(el=>{
      el.style.textAlign=l==='ar'?'right':'left';
      el.style.direction=l==='ar'?'rtl':'ltr';
    });
    const name=document.getElementById('cvFullName')?.value?.trim();
    const h1=box.querySelector('h1');
    if(h1&&!name)h1.textContent=l==='ar'?'سيرتي الذاتية':'Mon CV';
  }

  function refreshCvPreview(){
    const fn=window.updateCvPreview;
    if(typeof fn==='function')fn();
    enforceCvLanguage();
  }

  document.addEventListener('input',e=>{
    if(e.target&&e.target.closest&&e.target.closest('#cv'))setTimeout(enforceCvLanguage,0);
  });
  document.addEventListener('change',e=>{
    if(!e.target||!e.target.closest||!e.target.closest('#cv'))return;
    if(e.target.id==='cvLanguage')localizeCvLanguageUi();
    setTimeout(refreshCvPreview,0);
  });

  window.printCvPreview=function(){
    refreshCvPreview();
    requestAnimationFrame(()=>{
      enforceCvLanguage();
      window.print();
    });
  };

  const previousApply=window.applyLang;
  if(typeof previousApply==='function'){
    window.applyLang=function(){
      previousApply();
      localizeCvLanguageUi();
      setTimeout(refreshCvPreview,0);
    };
  }

  const previousLoad=window.loadCvIntoForm;
  if(typeof previousLoad==='function'){
    window.loadCvIntoForm=function(cv){
      previousLoad(cv);
      localizeCvLanguageUi();
      setTimeout(refreshCvPreview,0);
    };
  }

  localizeCvLanguageUi();
  setTimeout(refreshCvPreview,0);
})();
</script></body></html>`
  );

  fs.writeFileSync(file, html, 'utf8');
  console.log('Applied final CV language / RTL / PDF hotfix');
}
