import fs from 'node:fs';

const html=fs.readFileSync('public/index.html','utf8');
const server=fs.readFileSync('server/index.js','utf8');
const render=fs.readFileSync('render.yaml','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

const requireText=(value,label)=>{if(!html.includes(value))throw new Error(`Missing ${label}: ${value}`)};
const requireOnce=(value,label=value)=>{
  const count=html.split(value).length-1;
  if(count!==1)throw new Error(`${label} count=${count}, expected=1`);
};

for(const id of ['home','account','cv','letters','apps','ats','interview','feedback']){
  requireOnce(`id="${id}"`,`section ${id}`);
}

for(const id of ['health','dashCv','dashLetters','dashApps','cvPreview','cvList','letterList','appList','fbRating','fbCategory','fbMessage']){
  requireOnce(`id="${id}"`,`control ${id}`);
}
requireOnce("input.id='cvPhotoInput'",'control cvPhotoInput');
requireOnce("control.id='cvColorControl'",'control cvColorControl');
requireOnce("option.value=value;select.appendChild(option)",'professional CV template options');

for(const marker of [
  'CV_FINAL_RENDERER_V20_2',
  'CV_FINAL_POLISH_STYLES_V20_2',
  'REGISTRATION_STATE_UI_V20_2_4',
  'CV_UI_LANGUAGE_SYNC_V20_3_1',
  'CONNECTED_ACCOUNT_LAYOUT_V20_3_7_SCRIPT',
  'FEEDBACK_SECTION_LAYOUT_V20_3_8_SCRIPT',
  'HOME_DASHBOARD_LAYOUT_V20_3_9_SCRIPT',
  'OPTIONAL_CV_PHOTO_V20_4_1_SCRIPT',
  'CV_COLOR_PICKER_V20_4_2_SCRIPT',
  'PROFESSIONAL_CV_TEMPLATES_V20_5_0_SCRIPT'
])requireOnce(marker,marker);

for(const text of [
  'Accès rapide','ابدأ بسرعة','Créer un nouveau CV','إنشاء سيرة ذاتية جديدة',
  'Mon compte','حسابي','Aidez-nous à améliorer','ساعدنا على تحسين',
  'Photo personnelle (facultative)','الصورة الشخصية (اختيارية)',
  'Couleur du CV (facultative)','لون السيرة الذاتية (اختياري)',
  "body.data.photo=cvPhotoData",
  "body.data.themeColor=cvThemeColor",
  "box.style.setProperty('--cv-accent',cvThemeColor)",
  'Pro avec colonne','احترافي جانبي',
  "box.classList.add('pro-template')",
  "cv?.data?.photo||''",
  'cv-photo-preview',
  "document.documentElement.dir=lang==='ar'?'rtl':'ltr'",
  '@media(max-width:800px)'
])requireText(text,`release requirement`);

const scriptsOpen=(html.match(/<script(?:\s|>)/g)||[]).length;
const scriptsClose=(html.match(/<\/script>/g)||[]).length;
if(scriptsOpen!==scriptsClose)throw new Error(`Unbalanced scripts: ${scriptsOpen}/${scriptsClose}`);

if(!server.includes(`version: "${pkg.version}"`))throw new Error('Server version mismatch');
if(!html.includes(`v${pkg.version} Production`))throw new Error('Visible version mismatch');
if(!html.includes(`version officielle v${pkg.version}.`))throw new Error('French version copy mismatch');
if(!html.includes(`النسخة الرسمية v${pkg.version}.`))throw new Error('Arabic version copy mismatch');
if(!render.includes('value: production')||!render.includes('plan: free'))throw new Error('Render production settings mismatch');

console.log(`Release check passed: CV France v${pkg.version}, 8 sections, optional photo, ${scriptsOpen} scripts.`);
