import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_EDIT_PERSISTENCE_V20_5_7';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* CV_EDIT_PERSISTENCE_V20_5_7 */
(function(){
  const storageKey='cvf_active_cv_id';
  const readId=()=>{
    try{
      const id=Number(localStorage.getItem(storageKey)||0);
      return Number.isInteger(id)&&id>0?id:null;
    }catch{return null}
  };
  const writeId=id=>{
    try{
      const n=Number(id);
      if(Number.isInteger(n)&&n>0)localStorage.setItem(storageKey,String(n));
      else localStorage.removeItem(storageKey);
    }catch{}
  };

  const originalLoad=window.loadCvIntoForm;
  if(typeof originalLoad==='function'){
    window.loadCvIntoForm=function(cv){
      const result=originalLoad.apply(this,arguments);
      writeId(cv?.id);
      return result;
    };
  }

  const originalNew=window.newCvFinal;
  if(typeof originalNew==='function'){
    window.newCvFinal=function(){
      writeId(null);
      return originalNew.apply(this,arguments);
    };
  }

  const originalSave=window.saveCvFinal;
  if(typeof originalSave==='function'){
    window.saveCvFinal=async function(){
      const remembered=readId();
      if((typeof activeCvId==='undefined'||!Number.isInteger(activeCvId)||activeCvId<=0)&&remembered){
        activeCvId=remembered;
        if(typeof cvEditStatus==='function')cvEditStatus();
      }
      const result=await originalSave.apply(this,arguments);
      if(typeof activeCvId!=='undefined'&&Number.isInteger(activeCvId)&&activeCvId>0)writeId(activeCvId);
      return result;
    };
  }

  const originalDelete=window.deleteCvFinal;
  if(typeof originalDelete==='function'){
    window.deleteCvFinal=async function(id){
      const result=await originalDelete.apply(this,arguments);
      if(Number(readId())===Number(id))writeId(null);
      return result;
    };
  }

  async function restoreRememberedCv(){
    const id=readId();
    if(!id||!token)return;
    try{
      const r=await fetch(A+'/cvs/'+id,{headers:H()});
      if(!r.ok){
        if(r.status===404||r.status===401||r.status===403)writeId(null);
        return;
      }
      const d=await r.json();
      if(d?.cv&&typeof window.loadCvIntoForm==='function')window.loadCvIntoForm(d.cv);
    }catch{}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restoreRememberedCv,250),{once:true});
  else setTimeout(restoreRememberedCv,250);
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV edit persistence patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Persisted active CV edit mode across reloads.');
