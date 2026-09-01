import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='MOBILE_STABILITY_NAVIGATION_V20_5_2';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* MOBILE_STABILITY_NAVIGATION_V20_5_2 */
html,body{max-width:100%;overflow-x:clip}
*,*:before,*:after{box-sizing:border-box}
header,.topbar,.topbar>div,.nav,main,main>section,.card{min-width:0;max-width:100%}
img,svg,canvas{max-width:100%}
@media(max-width:800px){
 html,body{width:100%;overflow-x:hidden;overscroll-behavior-x:none}
 body{touch-action:pan-y}
 header{position:relative!important;width:100%;overflow:hidden}
 .topbar,.topbar>div{width:100%}
 .topbar h2{max-width:calc(100% - 104px);overflow-wrap:anywhere}
 .nav{display:flex!important;flex-wrap:wrap!important;overflow:visible!important;width:100%;gap:7px;padding:5px 0 2px!important;touch-action:manipulation}
 .nav button{flex:1 1 auto!important;min-width:72px;max-width:100%;padding:8px 10px!important;transform:none!important;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
 .nav button:hover,.nav button:active{transform:none!important}
 .lang{z-index:2;touch-action:manipulation}
 main{width:100%;margin:0 auto;padding-inline:10px!important}
 .card,.home-hero,.dashboard,.grid,.ats-cols,.template-row,.cv-form-sections,.letter-layout,.application-layout,#accountGrid,.feedback-fields{min-width:0!important;max-width:100%!important}
 #accountGrid.account-connected{grid-template-columns:minmax(0,1fr)!important;width:100%}
 input,textarea,select,button{max-width:100%}
 .cv-editor-section,.letter-panel,.application-panel,.feedback-form,.feedback-intro{min-width:0;max-width:100%}
 #cvPreview{max-width:100%;overflow-wrap:anywhere}
 .stat:hover,.stat:active,#home .home-action:hover,.nav button:hover{transform:none!important}
}
</style>
<script>/* MOBILE_STABILITY_NAVIGATION_V20_5_2_SCRIPT */
(function(){
  const targets={navHome:'home',navAccount:'account',navCv:'cv',navLetters:'letters',navApps:'apps',navAts:'ats',navInterview:'interview',navFeedback:'feedback'};
  document.querySelectorAll('.nav button').forEach(button=>{
    const target=targets[button.dataset.i18n];
    if(!target||button.dataset.mobileNavBound==='1')return;
    button.dataset.mobileNavBound='1';
    button.removeAttribute('onclick');
    button.addEventListener('click',event=>{
      event.preventDefault();
      if(target==='interview'&&typeof window.openInterviewPanel==='function')window.openInterviewPanel();
      else if(typeof window.show==='function')window.show(target);
    });
  });
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Mobile stability and navigation patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Stabilized the mobile layout and bound every navigation button.');
