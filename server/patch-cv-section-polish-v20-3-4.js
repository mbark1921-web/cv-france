import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_SECTION_POLISH_V20_3_4';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* CV_SECTION_POLISH_V20_3_4 */
.cv-preview-section .template-row h4,
.cv-editor-section[data-cv-section="saved"] .cv-list-head h4{display:none!important}
</style>
<script>/* CV_SECTION_POLISH_V20_3_4_SCRIPT */
(function(){
  let lastLanguage=document.documentElement.lang==='ar'?'ar':'fr';
  function polishCvLanguage(){
    const current=document.documentElement.lang==='ar'?'ar':'fr';
    const selector=document.getElementById('cvLanguage');
    if(selector&&selector.value!==current)selector.value=current;
    if(typeof localizeCvLanguageUi==='function')localizeCvLanguageUi();
    const newButton=document.getElementById('newCvButton');
    if(newButton)newButton.textContent=current==='ar'?'سيرة ذاتية جديدة':'Nouveau CV';
    const status=document.getElementById('cvEditStatus');
    if(status&&(/Création|جديدة/.test(status.textContent||'')))status.textContent=current==='ar'?'إنشاء سيرة ذاتية جديدة':'Création d’un nouveau CV';
    if(current!==lastLanguage){
      lastLanguage=current;
      const loader=window.loadCvsFinal||window.loadCvs;
      if(typeof loader==='function'&&localStorage.getItem('cvf_token'))setTimeout(()=>loader(),0);
    }
    if(typeof updateCvPreview==='function')setTimeout(()=>updateCvPreview(),0);
  }
  polishCvLanguage();
  new MutationObserver(polishCvLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV section polish patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Polished CV section headings and bilingual controls.');
