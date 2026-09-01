import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='EMPTY_BANNER_FIX_V20_5_5';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* EMPTY_BANNER_FIX_V20_5_5 */
#banner:empty{display:none!important;margin:0!important;padding:0!important;border:0!important;min-height:0!important}
#banner:not(:empty){display:block}
</style>
<script>/* EMPTY_BANNER_FIX_V20_5_5_SCRIPT */
(function(){
  const banner=document.getElementById('banner');
  if(!banner)return;
  const clean=()=>{if(!banner.textContent.trim()){banner.textContent='';banner.classList.remove('ok','err')}};
  new MutationObserver(clean).observe(banner,{childList:true,subtree:true,characterData:true});
  clean();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Empty banner patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Hidden the notification banner whenever it is empty.');
