import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='CONNECTED_ACCOUNT_LAYOUT_V20_3_7';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* CONNECTED_ACCOUNT_LAYOUT_V20_3_7 */
#accountGrid.account-connected{grid-template-columns:minmax(320px,620px);justify-content:center}
#accountGrid.account-connected>div:first-child{display:none!important}
#accountGrid.account-connected #logEmail,
#accountGrid.account-connected #logPass,
#accountGrid.account-connected button[data-i18n="login"],
#accountGrid.account-connected #passwordResetBtn{display:none!important}
#accountGrid.account-connected>div:last-child{padding:28px;text-align:center}
#accountGrid.account-connected #me{display:inline-block;margin:12px 0;padding:10px 15px;border-radius:999px;background:#eef6ff;color:#315078}
#accountGrid.account-connected button[data-i18n="logout"]{background:#fff;border:1px solid #fca5a5;color:#b42318}
</style>
<script>/* CONNECTED_ACCOUNT_LAYOUT_V20_3_7_SCRIPT */
(function(){
  const grid=document.getElementById('accountGrid');
  const identity=document.getElementById('me');
  if(!grid||!identity)return;
  function refreshAccountLayout(){
    const connected=Boolean(token);
    grid.classList.toggle('account-connected',connected);
    const heading=grid.lastElementChild?.querySelector('h3');
    if(heading)heading.textContent=connected?(lang==='ar'?'حسابي':'Mon compte'):T[lang].loginTitle;
    if(connected){
      const regPassword=document.getElementById('regPass');
      const loginPassword=document.getElementById('logPass');
      if(regPassword)regPassword.value='';
      if(loginPassword)loginPassword.value='';
    }
  }
  new MutationObserver(refreshAccountLayout).observe(identity,{childList:true,subtree:true,characterData:true});
  new MutationObserver(refreshAccountLayout).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const showBeforeConnectedAccount=window.show;
  window.show=function(id){showBeforeConnectedAccount(id);if(id==='account')setTimeout(refreshAccountLayout,0)};
  refreshAccountLayout();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Connected account layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Applied secure connected-account layout.');
