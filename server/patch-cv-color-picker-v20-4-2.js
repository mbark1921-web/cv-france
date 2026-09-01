import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CV_COLOR_PICKER_V20_4_2';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* CV_COLOR_PICKER_V20_4_2 */
.cv-color-control{margin:0 0 14px;padding:14px;border:1px solid #d5e0ed;border-radius:14px;background:#fbfdff}
.cv-color-control strong,.cv-color-control small{display:block}.cv-color-control small{margin-top:4px;color:#667085}
.cv-color-options{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:12px}
.cv-color-choice{width:34px;height:34px;padding:0;border-radius:50%;background:var(--swatch);border:3px solid #fff;box-shadow:0 0 0 1px #b9c7d8;position:relative}
.cv-color-choice.is-selected{box-shadow:0 0 0 3px #0b67e8}.cv-color-choice.is-selected:after{content:'✓';color:#fff;font-weight:900;position:absolute;inset:0;display:grid;place-items:center;text-shadow:0 1px 2px #0008}
.cv-custom-color{width:42px;height:36px;margin:0;padding:2px;border:1px solid #b9c7d8;border-radius:9px;background:#fff}
#cvPreview{--cv-accent:#111827}
#cvPreview h1,#cvPreview h2{color:var(--cv-accent)!important}
#cvPreview.classic{border-top-color:var(--cv-accent)!important}
#cvPreview.modern{border-left-color:var(--cv-accent)!important}
html[dir='rtl'] #cvPreview.modern{border-right-color:var(--cv-accent)!important}
#cvPreview.elegant h1{border-bottom:2px solid var(--cv-accent);padding-bottom:6px}
@media print{#cvPreview h1,#cvPreview h2{color:var(--cv-accent)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}#cvPreview.classic{border-top-color:var(--cv-accent)!important}#cvPreview.modern{border-left-color:var(--cv-accent)!important}html[dir='rtl'] #cvPreview.modern{border-right-color:var(--cv-accent)!important}}
</style>
<script>/* CV_COLOR_PICKER_V20_4_2_SCRIPT */
(function(){
  const personal=document.querySelector('.cv-editor-section[data-cv-section="personal"]');
  if(!personal||document.getElementById('cvColorControl'))return;
  const allowed=['#111827','#0b67e8','#16794b','#8b1e3f','#596579'];
  let cvThemeColor='#111827';
  const control=document.createElement('div');control.id='cvColorControl';control.className='cv-color-control';
  const title=document.createElement('strong'),help=document.createElement('small'),options=document.createElement('div');options.className='cv-color-options';
  const buttons=allowed.map(color=>{const button=document.createElement('button');button.type='button';button.className='cv-color-choice';button.style.setProperty('--swatch',color);button.dataset.color=color;button.onclick=()=>setColor(color);options.appendChild(button);return button});
  const custom=document.createElement('input');custom.id='cvCustomColor';custom.className='cv-custom-color';custom.type='color';custom.value=cvThemeColor;custom.oninput=()=>setColor(custom.value);
  options.appendChild(custom);control.append(title,help,options);
  const photo=document.querySelector('.cv-photo-control');personal.insertBefore(control,photo?photo.nextSibling:(personal.children[1]||null));
  function validColor(value){return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():'#111827'}
  function translate(){const ar=document.documentElement.lang==='ar';title.textContent=ar?'لون السيرة الذاتية (اختياري)':'Couleur du CV (facultative)';help.textContent=ar?'اختر لوناً للعناوين والزخرفة، أو احتفظ بالأسود الافتراضي.':'Choisissez la couleur des titres et des accents, ou gardez le noir par défaut.';const names=ar?['أسود','أزرق','أخضر','عنابي','رمادي']:['Noir','Bleu','Vert','Bordeaux','Gris'];buttons.forEach((button,index)=>{button.title=names[index];button.setAttribute('aria-label',names[index])});custom.title=ar?'لون مخصص':'Couleur personnalisée';custom.setAttribute('aria-label',custom.title)}
  function decorate(){buttons.forEach(button=>button.classList.toggle('is-selected',button.dataset.color===cvThemeColor));custom.value=cvThemeColor;const box=document.getElementById('cvPreview');if(box)box.style.setProperty('--cv-accent',cvThemeColor)}
  function setColor(value){cvThemeColor=validColor(value);decorate();if(typeof window.updateCvPreview==='function')window.updateCvPreview()}
  const originalBody=cvBody;cvBody=function(){const body=originalBody();body.data.themeColor=cvThemeColor;return body};
  const originalLoad=window.loadCvIntoForm;window.loadCvIntoForm=function(cv){originalLoad(cv);cvThemeColor=validColor(cv?.data?.themeColor);decorate();window.updateCvPreview()};
  const originalNew=window.newCvFinal;window.newCvFinal=function(){originalNew();cvThemeColor='#111827';decorate();window.updateCvPreview()};
  const originalPreview=window.updateCvPreview;window.updateCvPreview=function(){originalPreview();decorate()};
  window.printCvPreview=function(){window.updateCvPreview();requestAnimationFrame(()=>window.print())};
  new MutationObserver(()=>{translate();decorate()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();decorate();window.updateCvPreview();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('CV color picker patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Added optional per-CV color selection with preview and PDF support.');
