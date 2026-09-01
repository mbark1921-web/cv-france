import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='FEEDBACK_SUCCESS_V20_2_9';

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* FEEDBACK_SUCCESS_V20_2_9 */
function showFeedbackNotice(message,isError){
  const box=document.getElementById('banner');
  if(!box)return;
  box.className=isError?'err':'ok';
  box.textContent=message;
  clearTimeout(window.feedbackNoticeTimer);
  window.feedbackNoticeTimer=setTimeout(()=>{
    box.textContent='';
    box.className='';
  },8000);
}
window.sendFeedback=async function(){
  const body={
    rating:Number(v('fbRating')),
    category:v('fbCategory'),
    message:v('fbMessage'),
    page:location.pathname
  };
  try{
    const response=await fetch(A+'/feedback',{
      method:'POST',
      headers:{...H(),'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const data=await response.json();
    if(!response.ok){
      return showFeedbackNotice(data.error||(lang==='ar'?'تعذر إرسال الملاحظة.':'Impossible d’envoyer le retour.'),true);
    }
    document.getElementById('fbMessage').value='';
    showFeedbackNotice(lang==='ar'?'تم إرسال ملاحظتك بنجاح.':'Votre retour a bien été envoyé.',false);
  }catch{
    showFeedbackNotice(lang==='ar'?'تعذر إرسال الملاحظة. حاول مرة أخرى.':'Impossible d’envoyer le retour. Réessayez.',true);
  }
};
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Feedback success patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Applied localized feedback success message patch.');
