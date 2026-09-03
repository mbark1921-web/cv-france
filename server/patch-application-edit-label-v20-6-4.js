import fs from 'node:fs';

const htmlPath='public/index.html';
const marker='APPLICATION_EDIT_LABEL_V20_6_4';
let html=fs.readFileSync(htmlPath,'utf8');

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* APPLICATION_EDIT_LABEL_V20_6_4 */
(function(){
  const storageKey='cvf_active_application_id';
  const getId=()=>{try{const n=Number(localStorage.getItem(storageKey)||0);return Number.isInteger(n)&&n>0?n:null}catch{return null}};
  const saveBtn=()=>document.querySelector('#apps button.primary');
  const setLabel=()=>{
    const btn=saveBtn();
    if(!btn)return;
    const editing=!!getId();
    const ar=(document.documentElement.lang||'').toLowerCase().startsWith('ar')||document.documentElement.dir==='rtl';
    const desired=editing?(ar?'حفظ التعديلات':'Enregistrer les modifications'):(ar?'إضافة':'Ajouter');
    if((btn.textContent||'').trim()!==desired) btn.textContent=desired;
  };
  document.addEventListener('click',function(e){
    const target=e.target.closest('button');
    if(!target)return;
    const txt=(target.textContent||'').trim().toLowerCase();
    if(txt==='modifier'||txt==='تعديل'||txt.includes('nouvelle candidature')||txt.includes('طلب عمل جديد')){
      setTimeout(setLabel,0);
      setTimeout(setLabel,100);
    }
  },true);
  setTimeout(setLabel,50);
  setTimeout(setLabel,300);
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
  fs.writeFileSync(htmlPath,html,'utf8');
}

console.log('Updated candidature action label without mutation observer loop.');
