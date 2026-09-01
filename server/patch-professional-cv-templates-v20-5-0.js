import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='PROFESSIONAL_CV_TEMPLATES_V20_5_0';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* PROFESSIONAL_CV_TEMPLATES_V20_5_0 */
#cvTemplate option[value^="pro-"]{font-weight:700}
#cvPreview.pro-template{padding:0!important;overflow:hidden;border:0!important;background:#fff;display:block;min-height:680px}
#cvPreview.pro-template .pro-header{padding:30px 34px 24px;background:var(--cv-accent);color:#fff}
#cvPreview.pro-template .pro-header h1,#cvPreview.pro-template .pro-header p,#cvPreview.pro-template .pro-header span{color:#fff!important}
#cvPreview.pro-template .pro-header h1{margin:0 0 6px;font-size:32px}
#cvPreview.pro-template .pro-header p{margin:5px 0}
#cvPreview.pro-template .pro-content{display:grid;grid-template-columns:minmax(190px,32%) 1fr;min-height:560px}
#cvPreview.pro-template .pro-sidebar{padding:28px 24px;background:color-mix(in srgb,var(--cv-accent) 13%,white);min-width:0}
#cvPreview.pro-template .pro-main{padding:28px 32px;min-width:0}
#cvPreview.pro-template .pro-section{break-inside:avoid;margin:0 0 22px}
#cvPreview.pro-template .pro-section h2{margin:0 0 8px;font-size:16px;color:var(--cv-accent)!important;border-bottom:2px solid var(--cv-accent);padding-bottom:6px}
#cvPreview.pro-template .pro-section p{margin:0;line-height:1.55;white-space:pre-wrap}
#cvPreview.pro-template .cv-photo-preview{position:static!important;display:block;width:112px;height:112px;margin:0 auto 24px;transform:none!important;border:5px solid #fff;box-shadow:0 4px 16px #0002}
#cvPreview.pro-template.has-photo{padding:0!important}
#cvPreview.pro-coral .pro-header{background:#fff;color:#18212f;border-bottom:12px solid var(--cv-accent)}
#cvPreview.pro-coral .pro-header h1{color:var(--cv-accent)!important}
#cvPreview.pro-coral .pro-header p,#cvPreview.pro-coral .pro-header span{color:#344054!important}
#cvPreview.pro-coral .pro-sidebar{background:var(--cv-accent);color:#fff}
#cvPreview.pro-coral .pro-sidebar h2,#cvPreview.pro-coral .pro-sidebar p{color:#fff!important}
#cvPreview.pro-coral .pro-sidebar h2{border-bottom-color:#fff8}
#cvPreview.pro-graphite .pro-header{background:#30343b}
#cvPreview.pro-graphite .pro-sidebar{background:var(--cv-accent);color:#fff}
#cvPreview.pro-graphite .pro-sidebar h2,#cvPreview.pro-graphite .pro-sidebar p{color:#fff!important}
#cvPreview.pro-graphite .pro-sidebar h2{border-bottom-color:#fff7}
#cvPreview.pro-gold .pro-header{background:linear-gradient(135deg,var(--cv-accent) 0 38%,#fff 38%);padding-inline-start:42%;border-bottom:1px solid #e5e7eb}
#cvPreview.pro-gold .pro-header h1{color:var(--cv-accent)!important}
#cvPreview.pro-gold .pro-header p,#cvPreview.pro-gold .pro-header span{color:#344054!important}
#cvPreview.pro-gold .pro-sidebar{background:#f3f4f6;border-inline-end:8px solid var(--cv-accent)}
#cvPreview.pro-slate{border-top:18px solid var(--cv-accent)!important}
#cvPreview.pro-slate .pro-header{background:#fff;color:#18212f;padding-bottom:18px}
#cvPreview.pro-slate .pro-header h1{color:var(--cv-accent)!important}
#cvPreview.pro-slate .pro-header p,#cvPreview.pro-slate .pro-header span{color:#475467!important}
#cvPreview.pro-slate .pro-content{grid-template-columns:38% 1fr}
#cvPreview.pro-slate .pro-sidebar{background:#eef2f6}
@media(max-width:620px){#cvPreview.pro-template .pro-content{grid-template-columns:1fr}#cvPreview.pro-template .pro-sidebar,#cvPreview.pro-template .pro-main{padding:22px}#cvPreview.pro-gold .pro-header{background:#fff;padding-inline-start:26px;border-top:12px solid var(--cv-accent)}}
@media print{
 #cvPreview.pro-template{display:block!important;padding:0!important;overflow:hidden!important;border:0!important;min-height:0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 #cvPreview.pro-template .pro-header{padding:9mm 10mm 7mm!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 #cvPreview.pro-template .pro-content{display:grid!important;grid-template-columns:34% 66%!important;min-height:0!important}
 #cvPreview.pro-template .pro-sidebar{padding:8mm 7mm!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 #cvPreview.pro-template .pro-main{padding:8mm 9mm!important}
 #cvPreview.pro-template .cv-photo-preview{width:29mm!important;height:29mm!important;margin:0 auto 7mm!important}
 #cvPreview.pro-template .pro-section{margin-bottom:6mm!important}
 #cvPreview.pro-gold .pro-header{padding-inline-start:42%!important}
 #cvPreview.pro-slate{border-top:5mm solid var(--cv-accent)!important}
}
</style>
<script>/* PROFESSIONAL_CV_TEMPLATES_V20_5_0_SCRIPT */
(function(){
  const select=document.getElementById('cvTemplate');
  if(!select||select.querySelector('option[value="pro-ocean"]'))return;
  const models=['pro-ocean','pro-coral','pro-graphite','pro-gold','pro-slate'];
  models.forEach(value=>{const option=document.createElement('option');option.value=value;select.appendChild(option)});
  function translateOptions(){const ar=document.documentElement.lang==='ar';const names=ar?['احترافي جانبي','عصري ملوّن','رسمي داكن','أنيق مميز','بسيط احترافي']:['Pro avec colonne','Moderne coloré','Professionnel sombre','Élégant premium','Pro minimal'];models.forEach((value,index)=>{const option=select.querySelector('option[value="'+value+'"]');if(option)option.textContent=names[index]})}
  function professionalize(){
    const box=document.getElementById('cvPreview');
    if(!box||!models.includes(select.value))return;
    box.classList.add('pro-template');
    const children=[...box.children];
    const photo=children.find(el=>el.classList.contains('cv-photo-preview'));
    const h1=children.find(el=>el.tagName==='H1');
    const contact=children.find(el=>el.classList.contains('cv-contact'));
    const role=h1?children.slice(children.indexOf(h1)+1).find(el=>el.tagName==='P'&&!el.classList.contains('cv-contact')):null;
    const header=document.createElement('div');header.className='pro-header';
    [h1,role,contact].forEach(el=>{if(el)header.appendChild(el)});
    const sidebar=document.createElement('div');sidebar.className='pro-sidebar';
    if(photo)sidebar.appendChild(photo);
    const main=document.createElement('div');main.className='pro-main';
    const sideTitles=new Set(['الملف المهني','المهارات','اللغات','Profil professionnel','Compétences','Langues']);
    [...box.querySelectorAll('h2')].forEach(h=>{
      const p=h.nextElementSibling;
      const section=document.createElement('section');section.className='pro-section';section.appendChild(h);if(p&&p.tagName==='P')section.appendChild(p);
      (sideTitles.has(h.textContent.trim())?sidebar:main).appendChild(section);
    });
    const content=document.createElement('div');content.className='pro-content';content.append(sidebar,main);
    box.replaceChildren(header,content);
  }
  const originalPreview=window.updateCvPreview;window.updateCvPreview=function(){originalPreview();professionalize()};
  window.printCvPreview=function(){window.updateCvPreview();requestAnimationFrame(()=>window.print())};
  new MutationObserver(()=>{translateOptions();window.updateCvPreview()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translateOptions();window.updateCvPreview();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Professional CV templates patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Added five full-page professional colored CV templates.');
