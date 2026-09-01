import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'LETTER_BUTTON_I18N_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// LETTER_BUTTON_I18N_V20_2_9
function syncLetterNewButtonLabel(){
  const button=document.getElementById('newLetterButton');
  if(button)button.textContent=lang==='ar'?'رسالة جديدة':'Nouvelle lettre';
}
const updateLetterModeBeforeButtonI18n=updateLetterMode;
updateLetterMode=function(){
  updateLetterModeBeforeButtonI18n();
  syncLetterNewButtonLabel();
};
setTimeout(()=>syncLetterNewButtonLabel(),120);
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied bilingual new-letter button label.');
}
