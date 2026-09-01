import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='HOME_DASHBOARD_LAYOUT_V20_3_9';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* HOME_DASHBOARD_LAYOUT_V20_3_9 */
#home.home-polished{padding-top:8px}
#home .home-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.75fr);gap:28px;align-items:center;padding:34px;background:linear-gradient(135deg,#fff 0%,#f4f8ff 100%);overflow:hidden}
#home .home-copy h1{margin:0 0 12px;font-size:clamp(28px,4vw,42px);line-height:1.2;color:#0b2035}
#home .home-copy>.muted{max-width:680px;margin:0 0 20px;font-size:17px;line-height:1.7}
#home .home-health{display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 12px;border:1px solid #dce6f2;border-radius:999px;background:#fff;color:#52637a;font-size:14px}
#home .home-health:before{content:"";width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}
#home .home-actions{display:grid;gap:10px;padding:18px;border:1px solid #dbe5f0;border-radius:16px;background:rgba(255,255,255,.86);box-shadow:0 10px 30px rgba(15,39,66,.07)}
#home .home-actions h2{margin:0 0 4px;font-size:17px}
#home .home-action{display:flex;align-items:center;justify-content:space-between;width:100%;padding:13px 15px;border:1px solid #d8e2ee;background:#fff;color:#11263c;font-weight:700;text-align:start}
#home .home-action:hover{border-color:#0b6cf0;background:#f5f9ff;transform:translateY(-1px)}
#home .home-action:after{content:"→";color:#0b6cf0;font-size:20px}
html[dir="rtl"] #home .home-action:after{content:"←"}
#home .dashboard{gap:16px;margin-top:18px}
#home .stat{position:relative;min-height:112px;padding:22px;border-color:#dce5ef;background:#fff;box-shadow:0 8px 24px rgba(15,39,66,.05);transition:.2s ease}
#home .stat:after{content:"→";position:absolute;inset-inline-end:20px;bottom:18px;color:#0b6cf0;font-size:21px}
html[dir="rtl"] #home .stat:after{content:"←"}
#home .stat:hover,#home .stat:focus{border-color:#9fc4f5;box-shadow:0 12px 28px rgba(15,39,66,.1);transform:translateY(-2px);outline:none}
#home .stat strong{margin-top:12px;color:#0b6cf0;font-size:38px}
#home .stat span{font-weight:700;color:#52637a}
@media(max-width:800px){#home .home-hero{grid-template-columns:1fr;padding:24px}#home .home-actions{padding:14px}}
</style>
<script>/* HOME_DASHBOARD_LAYOUT_V20_3_9_SCRIPT */
(function(){
  const home=document.getElementById('home');
  const hero=home?.querySelector(':scope>.card');
  const title=hero?.querySelector('h1');
  const description=hero?.querySelector('p.muted');
  const health=document.getElementById('health')?.parentElement;
  const stats=home?.querySelectorAll('.dashboard .stat');
  if(!home||!hero||!title||!description||!health||!stats?.length)return;
  home.classList.add('home-polished');hero.classList.add('home-hero');health.classList.add('home-health');
  const copy=document.createElement('div');copy.className='home-copy';copy.append(title,description,health);
  const actions=document.createElement('div');actions.className='home-actions';
  const actionsTitle=document.createElement('h2');actions.append(actionsTitle);
  const definitions=[['cv',()=>document.getElementById('newCvBtn')?.click()],['letter',()=>document.getElementById('newLetterBtn')?.click()],['app',()=>document.getElementById('newAppBtn')?.click()]];
  const buttons=definitions.map(([type,reset])=>{const button=document.createElement('button');button.type='button';button.className='home-action';button.dataset.action=type;button.onclick=()=>{show(type==='letter'?'letters':type==='app'?'apps':'cv');setTimeout(reset,0)};actions.append(button);return button});
  hero.replaceChildren(copy,actions);
  stats.forEach(stat=>{stat.setAttribute('role','button');stat.tabIndex=0;stat.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();stat.click()}})});
  function translate(){
    const ar=document.documentElement.lang==='ar';
    actionsTitle.textContent=ar?'ابدأ بسرعة':'Accès rapide';
    const labels=ar?['إنشاء سيرة ذاتية جديدة','إنشاء رسالة تقديم','إضافة طلب عمل']:['Créer un nouveau CV','Créer une lettre','Ajouter une candidature'];
    buttons.forEach((button,index)=>button.textContent=labels[index]);
  }
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Home dashboard layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Upgraded the bilingual home dashboard and quick actions.');
