import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='LAUNCH_POLISH_V20_6_14';

if(html.includes(marker)){
  console.log('Launch polish patch already applied.');
  process.exit(0);
}

const patch=String.raw`
<style>/* ${marker} */
#accountGrid.account-connected #me{max-width:100%;overflow-wrap:anywhere;word-break:break-word;white-space:normal;line-height:1.35}
#regInvite.launch-hidden{display:none!important}
</style>
<script>/* ${marker}_SCRIPT */
(function(){
  function cleanupLiteralNewline(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const remove=[];
    while(walker.nextNode()){
      const n=walker.currentNode;
      if(n.nodeValue && n.nodeValue.trim()==='\\n') remove.push(n);
    }
    remove.forEach(n=>n.remove());
  }

  async function refreshLaunchPolish(){
    try{
      const r=await fetch('/api/public/config');
      const d=await r.json();
      const invite=document.getElementById('regInvite');
      if(invite) invite.classList.toggle('launch-hidden',String(d.registration_mode||'open')!=='invite');
    }catch{}
    cleanupLiteralNewline();
  }

  const observer=new MutationObserver(cleanupLiteralNewline);
  observer.observe(document.body,{childList:true,subtree:true});
  const previousShow=window.show;
  window.show=function(id){previousShow(id);setTimeout(refreshLaunchPolish,0)};
  refreshLaunchPolish();
})();
</script>`;

html=html.replace('</body></html>',patch+'</body></html>');
if(!html.includes(marker)) throw new Error('Launch polish patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Applied launch polish fixes for invitation field, account wrapping and stray newline.');
