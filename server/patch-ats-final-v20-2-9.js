import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const before=html;
const marker='ATS_FINAL_V20_2_9';

if(!html.includes(marker)){
  const patch=String.raw`
// ATS_FINAL_V20_2_9
window.analyzeAtsFinal=async function(){
  if(!token)return note(T[lang].loginFirst,true);
  const id=String(document.getElementById('atsCv')?.value||'');
  const offer=String(document.getElementById('atsOffer')?.value||'').trim();
  if(!id)return note(T[lang].chooseCvError,true);
  if(offer.length<30)return note(T[lang].offerError,true);
  const cv=(Array.isArray(atsCvs)?atsCvs:[]).find(x=>String(x.id)===id);
  if(!cv)return note(T[lang].chooseCvError,true);

  const savedLang=cv&&cv.data&&cv.data.cvLanguage==='ar'?'ar':(cv&&cv.data&&cv.data.cvLanguage==='fr'?'fr':'');
  const arCount=(offer.match(/[\u0600-\u06FF]/g)||[]).length;
  const latinCount=(offer.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  const offerLang=arCount>=8&&arCount>latinCount?'ar':(latinCount>=8&&latinCount>arCount?'fr':'');

  if(savedLang&&offerLang&&savedLang!==offerLang){
    const result=document.getElementById('atsResult');if(result)result.classList.remove('hidden');
    const score=document.getElementById('atsScore');if(score)score.textContent='—';
    const found=document.getElementById('atsFound');if(found){found.replaceChildren();const e=document.createElement('span');e.className='muted';e.textContent='—';found.appendChild(e)}
    const missing=document.getElementById('atsMissing');if(missing){missing.replaceChildren();const e=document.createElement('span');e.className='muted';e.textContent='—';missing.appendChild(e)}
    const advice=document.getElementById('atsAdvice');if(advice)advice.textContent=lang==='ar'
      ?'لغة السيرة الذاتية مختلفة عن لغة إعلان الوظيفة. لا يمكن إعطاء نسبة ATS دقيقة. استعمل سيرة ذاتية بنفس لغة الإعلان ثم أعد التحليل.'
      :'La langue du CV est différente de celle de l’offre. Un score ATS fiable n’est pas possible. Utilisez un CV dans la même langue que l’offre puis relancez l’analyse.';
    atsLast={score:null,found:[],missing:[],languageMismatch:true};
    return;
  }

  if(typeof window.analyzeAts==='function')return await window.analyzeAts();
  return note(T[lang].serverError,true);
};
`;
  html=html.replace('</script></body>',patch+'</script></body>');
}
html=html.replaceAll('onclick="analyzeAts()"','onclick="analyzeAtsFinal()"');
if(html!==before){fs.writeFileSync(file,html,'utf8');console.log('Applied final ATS language guard and direct button binding.');}
