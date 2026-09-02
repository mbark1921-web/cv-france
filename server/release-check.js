import fs from 'node:fs';

const html=fs.readFileSync('public/index.html','utf8');
const server=fs.readFileSync('server/index.js','utf8');
const render=fs.readFileSync('render.yaml','utf8');
const serviceWorker=fs.readFileSync('public/sw.js','utf8');
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
requireOnce('PROFESSIONAL_CV_PRINT_FIT_V20_5_1','professional CV print fit');
requireOnce('CV_EDIT_PERSISTENCE_V20_5_7','CV edit persistence');
requireOnce('CV_SAVE_SCROLL_V20_5_8','CV save scroll');
requireOnce('LETTER_LIST_STABILITY_V20_5_9','letter list stability');
requireOnce('APPLICATION_REAL_UPDATE_V20_6_0','application real update UI');

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
  'PROFESSIONAL_CV_TEMPLATES_V20_5_0_SCRIPT',
  'MOBILE_STABILITY_NAVIGATION_V20_5_2_SCRIPT'
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
  'grid-template-columns:38% 62%',
  "cv?.data?.photo||''",
  'cv-photo-preview',
  "document.documentElement.dir=lang==='ar'?'rtl':'ltr'",
  '@media(max-width:800px)',
  "navFeedback:'feedback'",
  'overscroll-behavior-x:none',
  "localStorage.getItem(storageKey)",
  "activeCvId=remembered",
  "target.scrollIntoView({behavior:'smooth',block:'center'})",
  "const generation=++loadGeneration",
  "const unique=[];const seen=new Set()",
  "method:editing?'PUT':'POST'",
  "cvf_active_application_id"
])requireText(text,`release requirement`);

const scriptsOpen=(html.match(/<script(?:\s|>)/g)||[]).length;
const scriptsClose=(html.match(/<\/script>/g)||[]).length;
if(scriptsOpen!==scriptsClose)throw new Error(`Unbalanced scripts: ${scriptsOpen}/${scriptsClose}`);

if(!server.includes(`version: "${pkg.version}"`))throw new Error('Server version mismatch');
if(!server.includes('EMAIL_READINESS_V20_5_7'))throw new Error('Generic email readiness patch missing');
if(!server.includes('APPLICATION_REAL_UPDATE_V20_6_0'))throw new Error('Application PUT route missing');
if(!server.includes('app.put("/api/applications/:id"'))throw new Error('Application update endpoint missing');
if(!server.includes('    "email",\n    "storage_writable"'))throw new Error('Public readiness does not require generic email');
if(!html.includes(`v${pkg.version} Production`))throw new Error('Visible version mismatch');
if(!html.includes(`version officielle v${pkg.version}.`))throw new Error('French version copy mismatch');
if(!html.includes(`النسخة الرسمية v${pkg.version}.`))throw new Error('Arabic version copy mismatch');
if(!render.includes('value: production')||!render.includes('plan: free'))throw new Error('Render production settings mismatch');
if(html.includes("navigator.serviceWorker.register('/sw.js')"))throw new Error('Service worker registration must stay disabled');
if(serviceWorker.includes('client.navigate('))throw new Error('Service worker must not reload client pages');

console.log(`Release check passed: CV France v${pkg.version}, real application updates, stable letters, persistent CV edit mode, ${scriptsOpen} scripts.`);
