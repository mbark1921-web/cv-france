import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='LETTER_LIST_STABILITY_V20_5_9';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* LETTER_LIST_STABILITY_V20_5_9 */
(function(){
  let loadGeneration=0;
  const activeKey='cvf_active_letter_id';
  const readActive=()=>{try{const n=Number(localStorage.getItem(activeKey)||0);return Number.isInteger(n)&&n>0?n:null}catch{return null}};
  const writeActive=id=>{try{const n=Number(id);if(Number.isInteger(n)&&n>0)localStorage.setItem(activeKey,String(n));else localStorage.removeItem(activeKey)}catch{}};

  const originalLoadIntoForm=window.loadLetterIntoForm;
  if(typeof originalLoadIntoForm==='function'){
    window.loadLetterIntoForm=function(letter){
      const result=originalLoadIntoForm.apply(this,arguments);
      writeActive(letter?.id);
      return result;
    };
  }

  const originalClear=window.clearLetterForm;
  if(typeof originalClear==='function'){
    window.clearLetterForm=function(){writeActive(null);return originalClear.apply(this,arguments)};
  }

  window.loadLettersFinal=async function(){
    const box=document.getElementById('letterList');
    if(!box||!token)return;
    const generation=++loadGeneration;
    const r=await fetch(A+'/letters',{headers:H()});
    const d=await r.json();
    if(generation!==loadGeneration||!r.ok)return;

    const source=Array.isArray(d.letters)?d.letters:[];
    const unique=[];const seen=new Set();
    for(const letter of source){
      const id=Number(letter?.id);
      const key=Number.isInteger(id)&&id>0?'id:'+id:'fallback:'+String(letter?.title||'')+'|'+String(letter?.company||'')+'|'+String(letter?.target_role||'');
      if(seen.has(key))continue;
      seen.add(key);unique.push(letter);
    }

    const fragment=document.createDocumentFragment();
    unique.forEach(letter=>{
      const row=document.createElement('div');
      row.className='record-item';
      row.dataset.letterId=String(letter.id||'');
      const main=document.createElement('div');main.className='record-main';
      const title=document.createElement('strong');title.textContent=letter.title||'Lettre';
      const meta=document.createElement('div');meta.className='muted';meta.textContent=[letter.company,letter.target_role].filter(Boolean).join(' — ');
      main.append(title,meta);
      const actions=document.createElement('div');actions.className='record-actions';
      actions.append(
        recordButton(lang==='ar'?'تعديل':'Modifier',()=>window.loadLetterIntoForm(letter)),
        recordButton(lang==='ar'?'حذف':'Supprimer',()=>window.deleteLetterFinal(letter.id),'record-delete')
      );
      row.append(main,actions);fragment.appendChild(row);
    });
    box.replaceChildren(fragment);
    updateLetterMode();
  };
  loadLetters=window.loadLettersFinal;

  const originalSave=window.saveLetterFinal;
  if(typeof originalSave==='function'){
    window.saveLetterFinal=async function(){
      const result=await originalSave.apply(this,arguments);
      if(typeof activeLetterId!=='undefined'&&Number.isInteger(activeLetterId)&&activeLetterId>0)writeActive(activeLetterId);
      return result;
    };
    saveLetter=window.saveLetterFinal;
  }

  const originalDelete=window.deleteLetterFinal;
  if(typeof originalDelete==='function'){
    window.deleteLetterFinal=async function(id){
      const result=await originalDelete.apply(this,arguments);
      if(Number(readActive())===Number(id))writeActive(null);
      return result;
    };
  }
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Letter list stability patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Stabilized saved-letter rendering and deduplicated concurrent loads.');
