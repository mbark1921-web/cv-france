import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

const marker = "applyLang();health();me();";
const patch = String.raw`
// Keep the live CV preview synchronized even when the browser restores form values after reload/deploy.
document.addEventListener('input',event=>{
  const id=event.target&&event.target.id||'';
  if(id.startsWith('cv')) updateCvPreview();
});
document.addEventListener('change',event=>{
  const id=event.target&&event.target.id||'';
  if(id.startsWith('cv')) updateCvPreview();
});
window.addEventListener('pageshow',()=>setTimeout(updateCvPreview,0));
setTimeout(updateCvPreview,50);
`;

html = html.replace(marker, patch + marker);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied resilient CV preview event patch.');
}
