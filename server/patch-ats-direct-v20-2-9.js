import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');

const start = html.indexOf('function analyzeAts(){');
const end = html.indexOf('async function sendFeedback()', start);
if (start === -1 || end === -1) throw new Error('ATS function not found');

const replacement = String.raw`function analyzeAts(){
  const id=String(document.getElementById('atsCv')?.value||'');
  const cv=(Array.isArray(atsCvs)?atsCvs:[]).find(x=>String(x.id)===id);
  if(!cv)return note(T[lang].chooseCvError,true);

  const offer=String(document.getElementById('atsOffer')?.value||'').trim();
  const offerWords=atsTokens(offer);
  if(offerWords.length<5)return note(T[lang].offerError,true);

  let data=cv?.data ?? cv?.data_json ?? {};
  if(typeof data==='string'){
    try{data=JSON.parse(data)}catch{data={raw:data}}
  }
  if(!data||typeof data!=='object')data={};

  const flatten=value=>{
    if(value==null)return '';
    if(typeof value==='string'||typeof value==='number')return String(value);
    if(Array.isArray(value))return value.map(flatten).join(' ');
    if(typeof value==='object')return Object.values(value).map(flatten).join(' ');
    return '';
  };

  const title=String(cv?.title||'').toLowerCase();
  const cvText=[cv?.title||'',cv?.target_role||'',flatten(data)].join(' ');
  const cvArabic=(cvText.match(/[\u0600-\u06FF]/g)||[]).length;
  const cvLatin=(cvText.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  let cvLang='';
  if(data.cvLanguage==='ar'||/arabe|arabic/.test(title))cvLang='ar';
  else if(data.cvLanguage==='fr'||/francais|français|french/.test(title))cvLang='fr';
  else if(cvArabic>=5&&cvArabic>=cvLatin*0.25)cvLang='ar';
  else if(cvLatin>=10&&cvLatin>cvArabic*1.5)cvLang='fr';

  const offerArabic=(offer.match(/[\u0600-\u06FF]/g)||[]).length;
  const offerLatin=(offer.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  let offerLang='';
  if(offerArabic>=8&&offerArabic>offerLatin)offerLang='ar';
  else if(offerLatin>=8&&offerLatin>offerArabic)offerLang='fr';

  if(cvLang&&offerLang&&cvLang!==offerLang){
    document.getElementById('atsResult')?.classList.remove('hidden');
    const score=document.getElementById('atsScore');
    if(score)score.textContent='—';
    for(const boxId of ['atsFound','atsMissing']){
      const box=document.getElementById(boxId);
      if(!box)continue;
      box.replaceChildren();
      const empty=document.createElement('span');
      empty.className='muted';
      empty.textContent='—';
      box.appendChild(empty);
    }
    const advice=document.getElementById('atsAdvice');
    if(advice)advice.textContent=lang==='ar'
      ?'لغة السيرة الذاتية مختلفة عن لغة إعلان الوظيفة. لا يمكن إعطاء نسبة ATS دقيقة. استعمل سيرة ذاتية بنفس لغة الإعلان ثم أعد التحليل.'
      :'La langue du CV est différente de celle de l’offre. Un score ATS fiable n’est pas possible. Utilisez un CV dans la même langue que l’offre puis relancez l’analyse.';
    atsLast=null;
    return;
  }

  const freq={};
  offerWords.forEach(w=>freq[w]=(freq[w]||0)+1);
  const keywords=[...new Set(offerWords)].sort((a,b)=>(freq[b]-freq[a])).slice(0,20);
  const cvSet=new Set(atsTokens(cvText));
  const found=keywords.filter(w=>cvSet.has(w));
  const missing=keywords.filter(w=>!cvSet.has(w));
  const score=Math.round(found.length/keywords.length*100);
  atsLast={score,found,missing};
  renderAts(atsLast);
}
`;

html = html.slice(0,start)+replacement+html.slice(end);
html = html.replace('data-i18n="analyze" onclick="analyzeAts()"','data-i18n="analyze" data-ats-engine="direct-v20.2.9" onclick="analyzeAts()"');

if (!html.includes('data-ats-engine="direct-v20.2.9"')) {
  throw new Error('ATS button marker missing');
}

fs.writeFileSync(file,html,'utf8');
console.log('Applied single direct ATS analyzer.');
