import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='MOBILE_NAVIGATION_LAYOUT_LOCK_V20_5_3';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* MOBILE_NAVIGATION_LAYOUT_LOCK_V20_5_3 */
#home .home-health{min-width:230px;min-height:42px;justify-content:flex-start;white-space:nowrap;font-variant-numeric:tabular-nums}
#health{display:inline-block;min-width:94px}
@media(max-width:800px){
 html{scrollbar-gutter:stable}
 body{position:relative;min-height:100dvh}
 header,main{contain:inline-size}
 main>section{width:100%;min-width:0}
 main>section.hidden{display:none!important}
 .nav button{min-height:44px}
 #home .home-health{width:100%;max-width:270px}
}
</style>
<script>/* MOBILE_NAVIGATION_LAYOUT_LOCK_V20_5_3_SCRIPT */
(function(){
  const targets={navHome:'home',navAccount:'account',navCv:'cv',navLetters:'letters',navApps:'apps',navAts:'ats',navInterview:'interview',navFeedback:'feedback'};
  const openSection=id=>{
    const destination=document.getElementById(id);
    if(!destination)return;
    document.querySelectorAll('main>section').forEach(section=>section.classList.toggle('hidden',section!==destination));
    document.querySelectorAll('.nav button').forEach(button=>{
      const active=targets[button.dataset.i18n]===id;
      button.classList.toggle('primary',active);
      button.setAttribute('aria-current',active?'page':'false');
    });
    if(id==='home'&&typeof loadDashboard==='function')loadDashboard();
    if(id==='cv'){if(typeof loadCvs==='function')loadCvs();if(typeof bindCvPreview==='function')setTimeout(bindCvPreview,0)}
    if(id==='letters'&&typeof loadLetters==='function')loadLetters();
    if(id==='apps'&&typeof loadApps==='function')loadApps();
    if(id==='ats'&&typeof loadAtsCvs==='function')loadAtsCvs();
    window.scrollTo({top:0,left:0,behavior:'instant'});
  };
  window.openCvFranceSection=openSection;
  document.querySelectorAll('.nav button').forEach(button=>{
    const target=targets[button.dataset.i18n];
    if(!target)return;
    button.removeAttribute('onclick');
    button.onclick=event=>{event.preventDefault();event.stopPropagation();openSection(target)};
  });
  document.querySelectorAll('#home .home-action').forEach(button=>{
    const type=button.dataset.action;
    if(!type)return;
    button.onclick=event=>{event.preventDefault();openSection(type==='letter'?'letters':type==='app'?'apps':'cv')};
  });
  openSection(document.querySelector('main>section:not(.hidden)')?.id||'home');
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Mobile navigation layout lock patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Locked mobile layout and installed direct section navigation.');
