import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='PROFESSIONAL_UI_V20_3';

if(!html.includes(marker)){
  const css=String.raw`
<style>/* PROFESSIONAL_UI_V20_3 */
:root{--navy:#0f1b2d;--navy-2:#16263d;--blue:#2563eb;--blue-dark:#1d4ed8;--gold:#f5b82e;--surface:#fff;--bg:#f3f6fb;--text:#172033;--muted:#667085;--border:#dfe5ee;--success:#dcfce7;--danger:#fee2e2;--shadow:0 12px 34px rgba(15,27,45,.08)}
*{box-sizing:border-box}
body{min-height:100vh;background:linear-gradient(180deg,#eef3fa 0,#f8fafc 340px);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,Tahoma,sans-serif}
header{position:sticky;top:0;z-index:20;padding:18px 24px;background:linear-gradient(135deg,var(--navy),var(--navy-2));box-shadow:0 8px 24px rgba(15,27,45,.2)}
.topbar{max-width:1180px;margin:0 auto;align-items:center}
.topbar h2{margin:0 0 14px;font-size:25px;letter-spacing:-.02em}.topbar h2 small{font-size:13px;font-weight:600;color:#b9c5d8}
.nav{gap:7px}.nav button{min-height:40px;padding:9px 14px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.95);color:var(--navy);font-weight:700;transition:transform .16s ease,background .16s ease,color .16s ease,box-shadow .16s ease}
.nav button:hover{transform:translateY(-1px);background:#fff;box-shadow:0 6px 16px rgba(0,0,0,.13)}
.nav button.active-nav{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 7px 18px rgba(37,99,235,.35)}
.lang{align-self:flex-start;min-width:92px;background:var(--gold);color:#172033;font-weight:800;box-shadow:0 6px 16px rgba(245,184,46,.24)}
main{max-width:1180px;padding:28px 24px 56px}
.card{padding:26px;border:1px solid var(--border);border-radius:18px;background:rgba(255,255,255,.97);box-shadow:var(--shadow)}
.card h1,.card h3{margin-top:0;color:var(--navy)}.card h3{font-size:22px}.muted{color:var(--muted)}
.dashboard{gap:18px}.stat{position:relative;overflow:hidden;min-height:140px;padding:24px;border:1px solid var(--border);border-radius:18px;background:#fff;box-shadow:var(--shadow);transition:transform .18s ease,box-shadow .18s ease}.stat:before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--blue)}html[dir="rtl"] .stat:before{inset:0 0 0 auto}.stat:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(15,27,45,.13)}.stat strong{color:var(--blue);font-size:42px}
input,textarea,select{min-height:46px;padding:12px 14px;margin:7px 0 15px;border:1px solid #cfd7e3;border-radius:11px;background:#fff;color:var(--text);font-size:15px;transition:border-color .15s ease,box-shadow .15s ease}
textarea{min-height:118px;resize:vertical}input:focus,textarea:focus,select:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 4px rgba(37,99,235,.12)}
button{min-height:42px;font-weight:700;transition:transform .15s ease,filter .15s ease}button:hover{filter:brightness(.98)}button:active{transform:translateY(1px)}
.primary,#pdfBtn{background:linear-gradient(135deg,var(--blue),var(--blue-dark));color:#fff;box-shadow:0 7px 16px rgba(37,99,235,.22)}
.ok{border:1px solid #86efac;background:var(--success);color:#166534}.err{border:1px solid #fca5a5;background:var(--danger);color:#991b1b}
.scorebox,.ats-panel,.interview-item{border-color:var(--border);background:#fff}.interview-item{box-shadow:0 5px 16px rgba(15,27,45,.05)}.interview-item h4{color:var(--navy)}
.record-toolbar,.cv-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
@media(max-width:800px){header{position:static;padding:15px 12px}.topbar{display:block}.topbar h2{font-size:22px}.lang{position:absolute;top:15px;inset-inline-end:12px}.nav{display:flex;overflow-x:auto;flex-wrap:nowrap;padding:3px 0 8px;scrollbar-width:thin}.nav button{flex:0 0 auto;padding:8px 12px}main{padding:16px 12px 38px}.card{padding:18px;border-radius:15px}.dashboard{gap:12px}.stat{min-height:110px;padding:18px}.stat strong{font-size:36px}.grid,.ats-cols{grid-template-columns:1fr}}
@media print{header{position:static;box-shadow:none}.card{box-shadow:none}}
</style>`;
  const script=String.raw`
<script>/* PROFESSIONAL_UI_V20_3_NAV */
(function(){
  const buttons=[...document.querySelectorAll('.nav button')];
  function activate(button){buttons.forEach(item=>item.classList.remove('active-nav'));if(button)button.classList.add('active-nav')}
  buttons.forEach(button=>button.addEventListener('click',()=>activate(button)));
  activate(buttons[0]);
})();
</script>`;
  html=html.replace('</head>',css+'</head>').replace('</body></html>',script+'</body></html>');
}

if(!html.includes(marker))throw new Error('Professional UI patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Applied CV France v20.3 professional UI.');
