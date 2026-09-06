import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='ACCESSIBILITY_UX_V1';
const source=fs.readFileSync(new URL('./accessibility-ux.browser.js',import.meta.url),'utf8');
const block='<script>/* '+marker+' */\n'+source+'\n</script>';
html=html.replace(/<script>\/\* ACCESSIBILITY_UX_V1 \*\/[\s\S]*?<\/script>\s*/g,'');
if(!html.includes('ACCOUNT_CONTROLS_V1'))throw new Error('Accessibility UX requires account controls to be installed first.');
html=html.replace('</body></html>',block+'</body></html>');
if(!html.includes(block))throw new Error('Accessibility UX build anchor missing.');
fs.writeFileSync(file,html);
console.log('Installed bilingual accessibility and UX reliability enhancements.');
