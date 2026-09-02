import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='VISIBLE_SAVE_FEEDBACK_V20_5_6';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* VISIBLE_SAVE_FEEDBACK_V20_5_6 */
#cvfToast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(18px);z-index:9999;max-width:min(92vw,560px);padding:13px 18px;border-radius:12px;font-weight:800;box-shadow:0 12px 35px rgba(15,27,45,.25);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;background:#dcfce7;color:#166534;border:1px solid #86efac;text-align:center}
#cvfToast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#cvfToast.error{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
#cv .primary.is-saving{opacity:.72;cursor:wait}
</style>
<script>/* VISIBLE_SAVE_FEEDBACK_V20_5_6_SCRIPT */
(function(){
  const toast=document.createElement('div');
  toast.id='cvfToast';
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  document.body.appendChild(toast);
  let timer=null;
  window.showCvfToast=function(message,isError){
    if(!message)return;
    clearTimeout(timer);
    toast.textContent=String(message);
    toast.classList.toggle('error',!!isError);
    toast.classList.add('show');
    timer=setTimeout(()=>toast.classList.remove('show'),3200);
  };

  if(typeof note==='function'){
    const originalNote=note;
    note=function(message,isError){
      const result=originalNote(message,isError);
      window.showCvfToast(message,isError);
      return result;
    };
  }

  if(typeof saveCv==='function'){
    const originalSaveCv=saveCv;
    saveCv=async function(){
      const button=[...document.querySelectorAll('#cv button')].find(b=>/Enregistrer|حفظ/.test((b.textContent||'').trim()) && !/PDF/.test(b.textContent||''));
      const oldText=button?button.textContent:'';
      if(button){button.disabled=true;button.classList.add('is-saving');button.textContent=document.documentElement.lang==='ar'?'جارٍ الحفظ…':'Enregistrement…';}
      try{
        const result=await originalSaveCv.apply(this,arguments);
        return result;
      }catch(error){
        window.showCvfToast(document.documentElement.lang==='ar'?'تعذر حفظ السيرة الذاتية':'Impossible d’enregistrer le CV',true);
        throw error;
      }finally{
        if(button){button.disabled=false;button.classList.remove('is-saving');button.textContent=oldText;}
      }
    };
  }
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Visible save feedback patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Added persistent visible feedback for CV saves.');
