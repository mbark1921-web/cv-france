import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const before=html;
const marker='ATS_HARD_BIND_V20_2_9';

if(!html.includes(marker)){
  const patch=String.raw`
// ATS_HARD_BIND_V20_2_9
(function(){
  function parseCvData(cv){
    let data=cv?.data ?? cv?.data_json ?? {};
    if(typeof data==='string'){
      try{data=JSON.parse(data)}catch{data={raw:data}}
    }
    return data&&typeof data==='object'?data:{};
  }
  function flatten(value){
    if(value==null)return '';
    if(typeof value==='string'||typeof value==='number')return String(value);
    if(Array.isArray(value))return value.map(flatten).join(' ');
    if(typeof value==='object')return Object.values(value).map(flatten).join(' ');
    return '';
  }
  function inferCvLang(cv){
    const data=parseCvData(cv);
    if(data.cvLanguage==='ar')return 'ar';
    if(data.cvLanguage==='fr')return 'fr';
    const title=String(cv?.title||'').toLowerCase();
    if(/\b(arabe|arabic|ar)\b/.test(title)||/[\u0600-\u06FF]/.test(title))return 'ar';
    if(/\b(francais|français|french|fr)\b/.test(title))return 'fr';
    const text=[cv?.target_role||'',flatten(data)].join(' ');
    const ar=(text.match(/[\u0600-\u06FF]/g)||[]).length;
    const latin=(text.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
    if(ar>=5&&ar>latin*0.35)return 'ar';
    if(latin>=10&&latin>ar*1.5)return 'fr';
    return '';
  }
  function inferOfferLang(text){
    const ar=(String(text||'').match(/[\u0600-\u06FF]/g)||[]).length;
    const latin=(String(text||'').match(/[A-Za-zÀ-ÿ]/g)||[]).length;
    if(ar>=8&&ar>latin)return 'ar';
    if(latin>=8&&latin>ar)return 'fr';
    return '';
  }
  function showMismatch(){
    const result=document.getElementById('atsResult');if(result)result.classList.remove('hidden');
    const score=document.getElementById('atsScore');if(score)score.textContent='—';
    for(const id of ['atsFound','atsMissing']){
      const box=document.getElementById(id);if(!box)continue;
      box.replaceChildren();
      const e=document.createElement('span');e.className='muted';e.textContent='—';box.appendChild(e);
    }
    const advice=document.getElementById('atsAdvice');
    if(advice)advice.textContent=lang==='ar'
      ?'لغة السيرة الذاتية مختلفة عن لغة إعلان الوظيفة. لا يمكن إعطاء نسبة ATS دقيقة. استعمل سيرة ذاتية بنفس لغة الإعلان ثم أعد التحليل.'
      :'La langue du CV est différente de celle de l’offre. Un score ATS fiable n’est pas possible. Utilisez un CV dans la même langue que l’offre puis relancez l’analyse.';
    atsLast={score:null,found:[],missing:[],languageMismatch:true};
  }
  async function hardAnalyze(){
    if(!token)return note(T[lang].loginFirst,true);
    const id=String(document.getElementById('atsCv')?.value||'');
    const offer=String(document.getElementById('atsOffer')?.value||'').trim();
    if(!id)return note(T[lang].chooseCvError,true);
    if(offer.length<30)return note(T[lang].offerError,true);
    const cv=(Array.isArray(atsCvs)?atsCvs:[]).find(x=>String(x.id)===id);
    if(!cv)return note(T[lang].chooseCvError,true);
    const cvLang=inferCvLang(cv);
    const offerLang=inferOfferLang(offer);
    if(cvLang&&offerLang&&cvLang!==offerLang){showMismatch();return;}
    if(typeof window.analyzeAts==='function')return await window.analyzeAts();
    return note(T[lang].serverError,true);
  }
  function bind(){
    const btn=document.querySelector('#ats button[data-i18n="analyze"]');
    if(!btn)return;
    btn.removeAttribute('onclick');
    btn.onclick=hardAnalyze;
    btn.dataset.atsBinding='hard-v20.2.9';
  }
  document.addEventListener('DOMContentLoaded',bind,{once:true});
  window.addEventListener('pageshow',()=>setTimeout(bind,0));
  setTimeout(bind,0);
})();
`;
  html=html.replace('</script></body>',patch+'</script></body>');
}
if(html!==before){fs.writeFileSync(file,html,'utf8');console.log('Applied hard-bound ATS analyzer.');}
