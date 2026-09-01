import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='FEEDBACK_SECTION_LAYOUT_V20_3_8';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* FEEDBACK_SECTION_LAYOUT_V20_3_8 */
#feedback.feedback-polished>.card{display:grid;grid-template-columns:minmax(230px,.72fr) minmax(0,1.4fr);gap:22px;align-items:start}
#feedback .feedback-intro{padding:24px;border-radius:14px;background:linear-gradient(145deg,#eff6ff,#f8fbff);border:1px solid #dbeafe}
#feedback .feedback-intro h3{margin:0 0 10px;font-size:24px}
#feedback .feedback-intro p{margin:0;color:#52637a;line-height:1.7}
#feedback .feedback-form{padding:4px}
#feedback .feedback-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#feedback .feedback-field label{display:block;margin:0 0 6px;font-weight:700}
#feedback .feedback-form textarea{min-height:180px}
#feedback .feedback-actions{display:flex;justify-content:flex-end;margin-top:4px}
#feedback .feedback-actions button{min-width:120px}
html[dir="rtl"] #feedback .feedback-actions{justify-content:flex-start}
@media(max-width:800px){#feedback.feedback-polished>.card{grid-template-columns:1fr}#feedback .feedback-fields{grid-template-columns:1fr}}
</style>
<script>/* FEEDBACK_SECTION_LAYOUT_V20_3_8_SCRIPT */
(function(){
  const section=document.getElementById('feedback');
  const card=section?.querySelector(':scope>.card');
  const heading=card?.querySelector('h3');
  const rating=document.getElementById('fbRating');
  const category=document.getElementById('fbCategory');
  const message=document.getElementById('fbMessage');
  const send=card?.querySelector('button[onclick="sendFeedback()"]');
  if(!section||!card||!heading||!rating||!category||!message||!send)return;
  section.classList.add('feedback-polished');
  const intro=document.createElement('div');intro.className='feedback-intro';
  const help=document.createElement('p');
  intro.append(heading,help);
  const form=document.createElement('div');form.className='feedback-form';
  const fields=document.createElement('div');fields.className='feedback-fields';
  function field(control){const box=document.createElement('div');box.className='feedback-field';const label=document.createElement('label');box.append(label,control);return {box,label}}
  const ratingField=field(rating),categoryField=field(category),messageField=field(message);
  fields.append(ratingField.box,categoryField.box);form.append(fields,messageField.box);
  const actions=document.createElement('div');actions.className='feedback-actions';actions.append(send);form.append(actions);
  card.replaceChildren(intro,form);
  function translate(){
    const ar=document.documentElement.lang==='ar';
    help.textContent=ar?'ساعدنا على تحسين CV France. اختر التقييم والتصنيف ثم اكتب ملاحظتك بوضوح.':'Aidez-nous à améliorer CV France. Choisissez une note et une catégorie, puis décrivez votre retour.';
    ratingField.label.textContent=ar?'التقييم':'Note';
    categoryField.label.textContent=ar?'التصنيف':'Catégorie';
    messageField.label.textContent=ar?'الملاحظة':'Votre message';
  }
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Feedback section layout patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Organized feedback form into a polished bilingual layout.');
