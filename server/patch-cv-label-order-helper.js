import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_LABEL_ORDER_HELPER_V20_2_9';

if(!html.includes(marker)){
  html=html.replace('</body></html>',`<script>/* ${marker} */
(function(){
  function tidyCvLanguageBlock(){
    const langLabel=document.getElementById('cvLanguageLabel');
    const langSelect=document.getElementById('cvLanguage');
    const templateLabel=document.querySelector('label[for="cvTemplate"]');
    const templateSelect=document.getElementById('cvTemplate');
    if(langLabel&&langSelect&&templateLabel&&templateSelect){
      const parent=templateLabel.parentElement;
      if(parent&&langLabel.parentElement===parent&&langSelect.parentElement===parent){
        parent.insertBefore(langLabel,templateLabel);
        parent.insertBefore(langSelect,templateLabel);
      }
    }
    const helper=document.querySelector('#cv .template-row>div:first-child .muted');
    const box=document.getElementById('cvPreview');
    if(helper&&box){
      const hasRealContent=Boolean(box.querySelector('h1')&&box.querySelector('h1').textContent&&box.querySelector('h1').textContent.trim()&&!box.querySelector('.empty'));
      helper.style.display=hasRealContent?'none':'';
    }
  }
  const previousUpdate=window.updateCvPreview;
  if(typeof previousUpdate==='function'){
    window.updateCvPreview=function(){
      const r=previousUpdate();
      tidyCvLanguageBlock();
      return r;
    };
  }
  document.addEventListener('change',e=>{
    if(e.target&&e.target.closest&&e.target.closest('#cv'))setTimeout(tidyCvLanguageBlock,0);
  });
  document.addEventListener('input',e=>{
    if(e.target&&e.target.closest&&e.target.closest('#cv'))setTimeout(tidyCvLanguageBlock,0);
  });
  setTimeout(tidyCvLanguageBlock,0);
})();
</script></body></html>`);
  fs.writeFileSync(file,html,'utf8');
  console.log('Fixed CV language/template label order and helper visibility');
}
