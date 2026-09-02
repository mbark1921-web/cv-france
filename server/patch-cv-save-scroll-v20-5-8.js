import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_SAVE_SCROLL_V20_5_8';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* CV_SAVE_SCROLL_V20_5_8 */
(function(){
  const originalSave=window.saveCvFinal;
  if(typeof originalSave!=='function')return;

  window.saveCvFinal=async function(){
    const result=await originalSave.apply(this,arguments);
    const hasError=Boolean(document.querySelector('#banner .err'));
    if(hasError)return result;

    requestAnimationFrame(()=>{
      const active=document.querySelector('.cv-item.active');
      const target=active||document.getElementById('cvList')||document.getElementById('cvListTitle');
      if(target&&typeof target.scrollIntoView==='function'){
        target.scrollIntoView({behavior:'smooth',block:'center'});
      }
      if(active){
        active.setAttribute('tabindex','-1');
        try{active.focus({preventScroll:true})}catch{}
      }
    });
    return result;
  };
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV save scroll patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Added automatic scroll to the saved CV after a successful save.');
