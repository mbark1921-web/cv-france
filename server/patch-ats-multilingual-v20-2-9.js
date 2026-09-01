import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
const marker = 'ATS_MULTILINGUAL_V20_2_9';

if (!html.includes(marker)) {
  const patch = String.raw`
// ATS_MULTILINGUAL_V20_2_9
function atsFlattenText(value){
  if(value==null)return '';
  if(typeof value==='string'||typeof value==='number')return String(value);
  if(Array.isArray(value))return value.map(atsFlattenText).join(' ');
  if(typeof value==='object')return Object.values(value).map(atsFlattenText).join(' ');
  return '';
}
function atsNormalizeText(text){
  return String(text||'').normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase();
}
const ATS_STOPWORDS=new Set([
  'avec','dans','pour','sur','les','des','une','un','du','de','la','le','et','ou','en','au','aux','est','etre','avoir','nous','vous','vos','notre','votre','qui','que','ce','ces','son','sa','ses','par','plus','bon','bonne','doit','candidat','candidate','poste','emploi','travail',
  'من','في','على','إلى','الى','عن','مع','هذا','هذه','ذلك','تلك','هو','هي','هم','نحن','أن','ان','او','أو','و','ثم','كما','ما','لا','لم','لن','قد','كل','أي','اي','لدى','لدي','بين','عبر','بعد','قبل','يجب','مطلوب','المرشح','المرشحة','العمل','الوظيفة'
]);
function atsTokens(text){
  const raw=atsNormalizeText(text).match(/[\p{L}\p{N}]+/gu)||[];
  return raw.filter(w=>w.length>=3&&!ATS_STOPWORDS.has(w));
}
function atsScript(text){
  const s=String(text||'');
  const ar=(s.match(/[\u0600-\u06FF]/g)||[]).length;
  const latin=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  if(ar>=8&&ar>latin*1.5)return 'ar';
  if(latin>=8&&latin>ar*1.5)return 'latin';
  return 'mixed';
}
function atsRenderChips(id,items,cls){
  const box=document.getElementById(id);if(!box)return;
  box.replaceChildren();
  items.forEach(word=>{const span=document.createElement('span');span.className='chip '+cls;span.textContent=word;box.appendChild(span)});
  if(!items.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='—';box.appendChild(empty)}
}
window.analyzeAts=async function(){
  if(!token)return note(T[lang].loginFirst,true);
  const id=String(document.getElementById('atsCv')?.value||'');
  const offer=String(document.getElementById('atsOffer')?.value||'').trim();
  if(!id)return note(T[lang].chooseCvError,true);
  if(offer.length<30)return note(T[lang].offerError,true);
  const cv=(Array.isArray(atsCvs)?atsCvs:[]).find(x=>String(x.id)===id);
  if(!cv)return note(T[lang].chooseCvError,true);

  const cvText=[cv.target_role||'',atsFlattenText(cv.data||{})].join(' ').trim();
  const offerScript=atsScript(offer),cvScript=atsScript(cvText);
  const result=document.getElementById('atsResult');
  if(result)result.classList.remove('hidden');

  if(offerScript!=='mixed'&&cvScript!=='mixed'&&offerScript!==cvScript){
    document.getElementById('atsScore').textContent='—';
    atsRenderChips('atsFound',[],'good');
    atsRenderChips('atsMissing',[],'miss');
    document.getElementById('atsAdvice').textContent=lang==='ar'
      ?'لغة السيرة الذاتية مختلفة عن لغة إعلان الوظيفة. لا يمكن إعطاء نسبة ATS دقيقة. استعمل سيرة ذاتية بنفس لغة الإعلان ثم أعد التحليل.'
      :'La langue du CV est différente de celle de l’offre. Un score ATS fiable n’est pas possible. Utilisez un CV dans la même langue que l’offre puis relancez l’analyse.';
    atsLast={score:null,found:[],missing:[],languageMismatch:true};
    return;
  }

  const cvSet=new Set(atsTokens(cvText));
  const offerWords=atsTokens(offer);
  const frequency=new Map();
  offerWords.forEach(w=>frequency.set(w,(frequency.get(w)||0)+1));
  const keywords=[...frequency.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,40);
  if(!keywords.length)return note(T[lang].offerError,true);
  const found=keywords.filter(w=>cvSet.has(w));
  const missing=keywords.filter(w=>!cvSet.has(w));
  const score=Math.round((found.length/keywords.length)*100);
  document.getElementById('atsScore').textContent=score+'%';
  atsRenderChips('atsFound',found,'good');
  atsRenderChips('atsMissing',missing,'miss');
  const advice=score>=80?T[lang].atsExcellent:score>=60?T[lang].atsGood:score>=35?T[lang].atsMedium:T[lang].atsLow;
  document.getElementById('atsAdvice').textContent=advice;
  atsLast={score,found,missing,languageMismatch:false};
};
`;
  html = html.replace('</script></body>', patch + '</script></body>');
}

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied multilingual ATS tokenizer and language mismatch guard.');
}
