import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_UI_LANGUAGE_SYNC_V20_3_1';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* CV_UI_LANGUAGE_SYNC_V20_3_1 */
(function(){
  function refreshCvLanguageOnly(){
    if(typeof localizeCvLanguageUi==='function')localizeCvLanguageUi();
    if(typeof updateCvPreview==='function')updateCvPreview();
  }
  document.addEventListener('change',event=>{
    if(event.target&&event.target.id==='cvLanguage')refreshCvLanguageOnly();
  });
  const showBeforeCvLanguageSync=window.show;
  window.show=function(id){
    showBeforeCvLanguageSync(id);
    if(id==='cv')setTimeout(refreshCvLanguageOnly,0);
  };
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV/UI language sync patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Kept interface language independent from CV document language.');
