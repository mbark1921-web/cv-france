import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'LETTER_MODE_LABEL_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// LETTER_MODE_LABEL_V20_2_9
const updateLetterModeBeforeLabelFix = updateLetterMode;
updateLetterMode = function(){
  const status=document.getElementById('letterEditStatus');
  if(!status)return;
  status.textContent=activeLetterId
    ?(lang==='ar'?'الوضع: تعديل الرسالة رقم '+activeLetterId:'Mode : modification de la lettre #'+activeLetterId)
    :(lang==='ar'?'الوضع: إنشاء رسالة جديدة':'Mode : création');
};
setTimeout(()=>updateLetterMode(),110);
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied clearer letter mode status label.');
}
