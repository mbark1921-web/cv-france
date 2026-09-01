import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_SECTION_LAYOUT_V20_3_2';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* CV_SECTION_LAYOUT_V20_3_2 */
#cv>.card.cv-editor-card{background:transparent;border:0;box-shadow:none;padding:0}
.cv-editor-card>h3{padding:0 4px;margin:0 0 18px;font-size:26px}
.cv-form-sections{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.cv-editor-section{padding:22px;border:1px solid var(--border,#dfe5ee);border-radius:16px;background:#fff;box-shadow:var(--shadow,0 12px 34px rgba(15,27,45,.08))}
.cv-editor-section h4{display:flex;align-items:center;gap:9px;margin:0 0 17px;color:var(--navy,#0f1b2d);font-size:18px}
.cv-editor-section h4:before{content:"";width:9px;height:9px;border-radius:50%;background:var(--blue,#2563eb);box-shadow:0 0 0 5px rgba(37,99,235,.11)}
.cv-editor-section .grid{gap:12px}
.cv-editor-section.cv-section-wide{grid-column:1/-1}
.cv-editor-section .template-row{margin-top:0}
.cv-editor-section .cv-list-head{margin-top:0}
html[dir="rtl"] .cv-editor-section h4{flex-direction:row}
@media(max-width:900px){.cv-form-sections{grid-template-columns:1fr}.cv-editor-section.cv-section-wide{grid-column:auto}}
@media(max-width:520px){.cv-editor-section{padding:16px}.cv-editor-card>h3{font-size:23px}}
@media print{.cv-form-sections{display:block}.cv-editor-section{display:none!important}.cv-editor-section.cv-preview-section{display:block!important;border:0!important;padding:0!important;box-shadow:none!important}.cv-preview-section>h4{display:none!important}}
</style>
<script>/* CV_SECTION_LAYOUT_V20_3_2_SCRIPT */
(function(){
  const cv=document.querySelector('#cv>.card');
  if(!cv||cv.querySelector('.cv-form-sections'))return;
  cv.classList.add('cv-editor-card');
  const layout=document.createElement('div');
  layout.className='cv-form-sections';
  cv.appendChild(layout);
  function section(key,wide,extraClass){
    // Use a div: the app's page router hides every nested <section> in <main>.
    const box=document.createElement('div');
    box.className='cv-editor-section'+(wide?' cv-section-wide':'')+(extraClass?' '+extraClass:'');
    box.dataset.cvSection=key;
    const heading=document.createElement('h4');
    heading.dataset.cvSectionTitle=key;
    box.appendChild(heading);layout.appendChild(box);return box;
  }
  function move(box,node){if(node)box.appendChild(node)}
  function gridFor(id){return document.getElementById(id)?.closest('.grid')}
  const personal=section('personal',false,'');
  ['cvTitle','cvRole'].forEach(id=>move(personal,document.getElementById(id)));
  move(personal,gridFor('cvFullName'));move(personal,gridFor('cvEmail'));
  const career=section('career',false,'');
  ['cvProfile','cvExperience'].forEach(id=>move(career,document.getElementById(id)));
  const skills=section('skills',false,'');
  ['cvSkills','cvEducation','cvLanguages'].forEach(id=>move(skills,document.getElementById(id)));
  const settings=section('settings',false,'');
  ['cvLanguageLabel','cvLanguage'].forEach(id=>move(settings,document.getElementById(id)));
  move(settings,cv.querySelector('label[for="cvTemplate"]'));move(settings,document.getElementById('cvTemplate'));
  move(settings,cv.querySelector('.cv-actions'));move(settings,document.getElementById('pdfBtn'));
  const preview=section('preview',true,'cv-preview-section');move(preview,cv.querySelector('.template-row'));
  const saved=section('saved',true,'');move(saved,cv.querySelector('.cv-list-head'));move(saved,document.getElementById('cvList'));
  const titles={
    fr:{personal:'Informations personnelles',career:'Profil et expériences',skills:'Compétences et formation',settings:'Langue, modèle et actions',preview:'Aperçu du CV',saved:'CV enregistrés'},
    ar:{personal:'المعلومات الشخصية',career:'الملف المهني والخبرات',skills:'المهارات والتكوين',settings:'اللغة والقالب والإجراءات',preview:'معاينة السيرة الذاتية',saved:'السير الذاتية المحفوظة'}
  };
  function localize(){const d=titles[document.documentElement.lang==='ar'?'ar':'fr'];layout.querySelectorAll('[data-cv-section-title]').forEach(h=>h.textContent=d[h.dataset.cvSectionTitle])}
  localize();new MutationObserver(localize).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV section layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Organized the CV editor into five responsive sections.');
