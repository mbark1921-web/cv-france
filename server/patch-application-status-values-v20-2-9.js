import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'APPLICATION_STATUS_VALUES_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// APPLICATION_STATUS_VALUES_V20_2_9
const APPLICATION_STATUS_VALUES={
  sent:'Envoyée',
  interview:'Entretien',
  followup:'Relance',
  rejected:'Refus',
  accepted:'Acceptée'
};
function syncApplicationStatusValues(){
  const select=document.getElementById('appStatus');
  if(!select)return;
  const selectedIndex=select.selectedIndex;
  Array.from(select.options).forEach(option=>{
    const key=option.dataset.i18nOption;
    if(key&&APPLICATION_STATUS_VALUES[key]) option.value=APPLICATION_STATUS_VALUES[key];
  });
  if(selectedIndex>=0&&selectedIndex<select.options.length) select.selectedIndex=selectedIndex;
}
const syncApplicationI18nBeforeStatusValues=typeof syncApplicationI18n==='function'?syncApplicationI18n:null;
if(syncApplicationI18nBeforeStatusValues){
  syncApplicationI18n=function(){
    syncApplicationI18nBeforeStatusValues();
    syncApplicationStatusValues();
  };
}
const updateApplicationModeBeforeStatusValues=updateApplicationMode;
updateApplicationMode=function(){
  updateApplicationModeBeforeStatusValues();
  syncApplicationStatusValues();
};
setTimeout(()=>syncApplicationStatusValues(),160);
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied canonical application status values for bilingual UI.');
}
