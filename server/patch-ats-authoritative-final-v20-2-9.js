import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='ATS_AUTHORITATIVE_FINAL_V20_2_9';

if(!html.includes(marker)){
  const script=String.raw`<script>/* ATS_AUTHORITATIVE_FINAL_V20_2_9 */
(function(){
  function flatten(value){
    if(value==null)return '';
    if(typeof value==='string'||typeof value==='number')return String(value);
    if(Array.isArray(value))return value.map(flatten).join(' ');
    if(typeof value==='object')return Object.values(value).map(flatten).join(' ');
    return '';
  }
  function parseData(cv){
    let data=cv?.data ?? cv?.data_json ?? {};
    if(typeof data==='string'){
      try{data=JSON.parse(data)}catch{data={raw:data}}
    }
    return data&&typeof data==='object'?data:{};
  }
  function detectCvLanguage(cv){
    const data=parseData(cv);
    if(data.cvLanguage==='ar')return 'ar';
    if(data.cvLanguage==='fr')return 'fr';
    const title=String(cv?.title||'').toLowerCase();
    if(/arabe|arabic/.test(title))return 'ar';
    if(/francais|français|french/.test(title))return 'fr';
    const text=[cv?.title||'',cv?.target_role||'',flatten(data)].join(' ');
    const ar=(text.match(/[\u0600-\u06FF]/g)||[]).length;
    const latin=(text.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
    if(ar>=5&&ar>=latin*0.25)return 'ar';
    if(latin>=10&&latin>ar*1.5)return 'fr';
    return '';
  }
  function detectOfferLanguage(text){
    const s=String(text||'');
    const ar=(s.match(/[\u0600-\u06FF]/g)||[]).length;
    const latin=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
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
    atsLast=null;
  }
  const stop=new Set(['avec','pour','dans','des','les','une','sur','vous','nous','notre','votre','aux','par','qui','que','est','sont','plus','ses','son','vos','leur','leurs','afin','ainsi','comme','tout','tous','toute','toutes','cette','cet','ces','etre','être','avoir','poste','emploi','mission','missions','profil','recherche','recherché','entreprise','candidat','candidate','de','du','la','le','et','en','un','au','ou','à','a','the','and','for','with','you','your','our','are','this','that','from','will','job','role','في','من','على','إلى','الى','عن','مع','هذا','هذه','ذلك','التي','الذي','الذين','كما','يتم','يجب','لدى','بين','كل','أو','او','أن','ان','هو','هي','وظيفة','العمل','شركة','المطلوب','مطلوب']);
  function words(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}+#]+/gu,' ').split(/\s+/).filter(w=>w.length>=3&&!stop.has(w))}

  window.analyzeAts=function(){
    const id=String(document.getElementById('atsCv')?.value||'');
    const cv=(Array.isArray(atsCvs)?atsCvs:[]).find(x=>String(x.id)===id);
    if(!cv)return note(T[lang].chooseCvError,true);
    const offer=String(document.getElementById('atsOffer')?.value||'').trim();
    const offerWords=words(offer);
    if(offerWords.length<5)return note(T[lang].offerError,true);

    const cvLang=detectCvLanguage(cv);
    const offerLang=detectOfferLanguage(offer);
    if(cvLang&&offerLang&&cvLang!==offerLang){showMismatch();return;}

    const freq={};offerWords.forEach(w=>freq[w]=(freq[w]||0)+1);
    const keywords=[...new Set(offerWords)].sort((a,b)=>(freq[b]-freq[a])).slice(0,20);
    const data=parseData(cv);
    const cvText=[cv.title||'',cv.target_role||'',flatten(data)].join(' ');
    const cvSet=new Set(words(cvText));
    const found=keywords.filter(w=>cvSet.has(w));
    const missing=keywords.filter(w=>!cvSet.has(w));
    const score=Math.round(found.length/keywords.length*100);
    atsLast={score,found,missing};
    renderAts(atsLast);
  };

  const btn=document.querySelector('#ats button[data-i18n="analyze"]');
  if(btn){btn.onclick=window.analyzeAts;btn.removeAttribute('onclick');btn.addEventListener('click',window.analyzeAts);}
})();
</script>`;
  html=html.replace('</body></html>',script+'</body></html>');
}
fs.writeFileSync(file,html,'utf8');
console.log('Applied authoritative final ATS analyzer.');
