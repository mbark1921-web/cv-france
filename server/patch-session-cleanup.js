import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='SESSION_CLEANUP_V1';
const source=fs.readFileSync(new URL('./session-cleanup.browser.js',import.meta.url),'utf8');
const block='<script>/* '+marker+' */\n'+source+'\n</script>';
html=html.replace(/<script>\/\* SESSION_CLEANUP_V1 \*\/[\s\S]*?<\/script>\s*/g,'');
html=html.replace('<head>','<head>'+block);
html=html.replace("token=d.token;localStorage.setItem('cvf_token',token);note(T[lang].accountCreated);me();loadDashboard()","resetUserSession(d.token,T[lang].accountCreated)");
html=html.replace("token=d.token;localStorage.setItem('cvf_token',token);note(T[lang].connected);me();loadDashboard()","resetUserSession(d.token,T[lang].connected)");
html=html.replace("function logout(){token='';localStorage.removeItem('cvf_token');$('me').textContent=T[lang].notConnected;loadDashboard()}","function logout(){resetUserSession()}");
for(const required of ['<head>'+block,'resetUserSession(d.token,T[lang].accountCreated)','resetUserSession(d.token,T[lang].connected)','function logout(){resetUserSession()}']) {
  if(!html.includes(required))throw new Error('Session cleanup build anchor missing: '+required.slice(0,100));
}
fs.writeFileSync(file,html);
console.log('Installed account-owned session cleanup before application initialization.');
