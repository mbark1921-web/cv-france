import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='APPLICATION_UPDATE_RUNTIME_V20_6_2';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* APPLICATION_UPDATE_RUNTIME_V20_6_2 */
(function(){
  const storageKey='cvf_active_application_id';
  const readStored=()=>{try{const n=Number(localStorage.getItem(storageKey)||0);return Number.isInteger(n)&&n>0?n:null}catch{return null}};
  const store=id=>{try{const n=Number(id);if(Number.isInteger(n)&&n>0)localStorage.setItem(storageKey,String(n));else localStorage.removeItem(storageKey)}catch{}};

  window.saveApplicationFinal=async function(){
    const liveId=(typeof activeApplicationId!=='undefined'&&Number.isInteger(Number(activeApplicationId))&&Number(activeApplicationId)>0)?Number(activeApplicationId):null;
    const storedId=readStored();
    const editingId=liveId||storedId;
    const editing=Number.isInteger(editingId)&&editingId>0;
    if(editing&&typeof activeApplicationId!=='undefined')activeApplicationId=editingId;

    const body={company:v('appCompany'),role:v('appRole'),status:v('appStatus'),applied_date:v('appDate'),notes:v('appNotes')};
    const endpoint=editing?A+'/applications/'+editingId:A+'/applications';
    const r=await fetch(endpoint,{method:editing?'PUT':'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    if(!r.ok)return note(d.error||T[lang].serverError,true);

    const finalId=editing?editingId:Number(d.id||0);
    if(Number.isInteger(finalId)&&finalId>0){
      if(typeof activeApplicationId!=='undefined')activeApplicationId=finalId;
      store(finalId);
    }
    note(editing?(lang==='ar'?'تم تحديث طلب العمل':'Candidature mise à jour'):T[lang].appSaved);
    if(typeof updateApplicationMode==='function')updateApplicationMode();
    if(typeof window.loadAppsFinal==='function')await window.loadAppsFinal();
    if(typeof loadDashboard==='function')loadDashboard();
  };

  try{saveApp=window.saveApplicationFinal}catch{}
  const saveButton=document.querySelector('#apps button.primary');
  if(saveButton)saveButton.setAttribute('onclick','window.saveApplicationFinal()');

  const previousLoad=window.loadApplicationIntoForm;
  window.loadApplicationIntoForm=function(app){
    const result=typeof previousLoad==='function'?previousLoad.apply(this,arguments):undefined;
    const id=Number(app?.id);
    if(Number.isInteger(id)&&id>0){
      if(typeof activeApplicationId!=='undefined')activeApplicationId=id;
      store(id);
      if(typeof updateApplicationMode==='function')updateApplicationMode();
    }
    return result;
  };
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Application update runtime patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Hardened candidature updates so edit identity survives runtime/global binding issues.');
