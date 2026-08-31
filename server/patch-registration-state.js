import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'REGISTRATION_STATE_UI_V20_2_3';

if (!html.includes(marker)) {
  html = html.replace(
    '<section id="account" class="hidden"><div class="grid">',
    '<section id="account" class="hidden"><div id="registrationState" class="card hidden"></div><div class="grid" id="accountGrid">'
  );

  html = html.replace(
    '</script></body></html>',
    `\n<script>/* ${marker} */\nasync function syncRegistrationState(){\n  try{\n    const r=await fetch('/api/public/config');\n    const d=await r.json();\n    const mode=String(d.registration_mode||'open');\n    const grid=document.getElementById('accountGrid');\n    const state=document.getElementById('registrationState');\n    if(!grid||!state)return;\n    const createCard=grid.firstElementChild;\n    if(mode==='closed'){\n      if(createCard)createCard.classList.add('hidden');\n      state.classList.remove('hidden');\n      state.textContent=lang==='ar'?'إنشاء الحسابات الجديدة متوقف مؤقتاً. يمكن للحسابات الحالية تسجيل الدخول بشكل عادي.':'La création de nouveaux comptes est temporairement fermée. Les comptes existants peuvent se connecter normalement.';\n    }else{\n      if(createCard)createCard.classList.remove('hidden');\n      state.classList.add('hidden');\n      state.textContent='';\n    }\n  }catch{}\n}\nconst oldShowRegistrationState=show;\nshow=function(id){oldShowRegistrationState(id);if(id==='account')syncRegistrationState();};\nconst oldApplyLangRegistrationState=applyLang;\napplyLang=function(){oldApplyLangRegistrationState();syncRegistrationState();};\nsyncRegistrationState();\n</script></body></html>`
  );

  fs.writeFileSync(file, html, 'utf8');
  console.log('Injected registration state UI');
}
