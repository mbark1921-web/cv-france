import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'APPLICATION_I18N_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// APPLICATION_I18N_V20_2_9
function syncApplicationI18n(){
  const button=document.getElementById('newApplicationButton');
  if(button)button.textContent=lang==='ar'?'طلب عمل جديد':'Nouvelle candidature';
  const mode=document.getElementById('appEditStatus');
  if(mode)mode.textContent=activeApplicationId
    ?(lang==='ar'?'الوضع: تعديل طلب العمل رقم '+activeApplicationId:'Mode : modification de la candidature #'+activeApplicationId)
    :(lang==='ar'?'الوضع: إنشاء طلب عمل جديد':'Mode : création');
  const notes=document.getElementById('appNotes');
  if(notes){
    notes.placeholder=lang==='ar'?'ملاحظات':'Notes';
    notes.setAttribute('aria-label',lang==='ar'?'ملاحظات':'Notes');
  }
  const date=document.getElementById('appDate');
  if(date){
    date.lang=lang==='ar'?'ar':'fr';
    date.setAttribute('aria-label',lang==='ar'?'تاريخ التقديم':'Date de candidature');
    date.title=lang==='ar'?'تاريخ التقديم':'Date de candidature';
  }
}
const updateApplicationModeBeforeI18n=updateApplicationMode;
updateApplicationMode=function(){
  updateApplicationModeBeforeI18n();
  syncApplicationI18n();
};
const toggleLangBeforeApplicationI18n=toggleLang;
toggleLang=function(){
  toggleLangBeforeApplicationI18n();
  setTimeout(()=>syncApplicationI18n(),0);
};
setTimeout(()=>syncApplicationI18n(),140);
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied bilingual application form labels and clearer mode status.');
}
