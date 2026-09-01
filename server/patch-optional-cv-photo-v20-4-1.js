import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='OPTIONAL_CV_PHOTO_V20_4_1';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* OPTIONAL_CV_PHOTO_V20_4_1 */
.cv-photo-control{display:flex;align-items:center;gap:14px;margin:0 0 14px;padding:14px;border:1px dashed #bfd0e5;border-radius:14px;background:#f8fbff}
.cv-photo-thumb{width:72px;height:72px;flex:0 0 72px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 3px 12px rgba(15,39,66,.16)}
.cv-photo-thumb.is-empty{display:none}
.cv-photo-copy{flex:1;min-width:0}.cv-photo-copy strong,.cv-photo-copy small{display:block}.cv-photo-copy small{margin-top:4px;color:#667085;line-height:1.45}
.cv-photo-buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.cv-photo-buttons button{padding:8px 11px;border:1px solid #cad7e6;background:#fff;color:#17324d}.cv-photo-buttons .cv-photo-remove{color:#b42318;border-color:#f5b8b8}
.cv-preview.has-photo{position:relative;padding-inline-end:165px}.cv-preview .cv-photo-preview{position:absolute;inset-inline-end:32px;top:30px;width:108px;height:108px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 3px 14px rgba(15,39,66,.18)}
@media(max-width:620px){.cv-photo-control{align-items:flex-start;flex-wrap:wrap}.cv-preview.has-photo{padding-inline-end:28px;padding-top:155px}.cv-preview .cv-photo-preview{inset-inline-start:50%;inset-inline-end:auto;transform:translateX(-50%)}}
@media print{#cvPreview.has-photo{position:relative!important;padding-inline-end:42mm!important}#cvPreview .cv-photo-preview{display:block!important;width:30mm!important;height:30mm!important;inset-inline-end:8mm!important;top:8mm!important}}
</style>
<script>/* OPTIONAL_CV_PHOTO_V20_4_1_SCRIPT */
(function(){
  const personal=document.querySelector('.cv-editor-section[data-cv-section="personal"]');
  if(!personal||document.getElementById('cvPhotoInput'))return;
  let cvPhotoData='';
  const control=document.createElement('div');control.className='cv-photo-control';
  const thumb=document.createElement('img');thumb.className='cv-photo-thumb is-empty';thumb.alt='';
  const copy=document.createElement('div');copy.className='cv-photo-copy';
  const title=document.createElement('strong'),help=document.createElement('small');
  const buttons=document.createElement('div');buttons.className='cv-photo-buttons';
  const choose=document.createElement('button');choose.type='button';
  const remove=document.createElement('button');remove.type='button';remove.className='cv-photo-remove';remove.hidden=true;
  const input=document.createElement('input');input.id='cvPhotoInput';input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;
  buttons.append(choose,remove,input);copy.append(title,help,buttons);control.append(thumb,copy);
  personal.insertBefore(control,personal.children[1]||null);
  function refreshControl(){const has=Boolean(cvPhotoData);thumb.classList.toggle('is-empty',!has);thumb.src=has?cvPhotoData:'';remove.hidden=!has}
  function translate(){const ar=document.documentElement.lang==='ar';title.textContent=ar?'الصورة الشخصية (اختيارية)':'Photo personnelle (facultative)';help.textContent=ar?'يمكنك إضافة صورة أو ترك السيرة الذاتية بدون صورة. JPG أو PNG أو WebP، بحد أقصى 2MB.':'Ajoutez une photo seulement si vous le souhaitez. JPG, PNG ou WebP, 2 Mo maximum.';choose.textContent=ar?(cvPhotoData?'تغيير الصورة':'إضافة صورة'):(cvPhotoData?'Changer la photo':'Ajouter une photo');remove.textContent=ar?'حذف الصورة':'Supprimer la photo'}
  function render(){refreshControl();translate();if(typeof window.updateCvPreview==='function')window.updateCvPreview()}
  choose.onclick=()=>input.click();remove.onclick=()=>{cvPhotoData='';input.value='';render()};
  input.onchange=()=>{const file=input.files?.[0];if(!file)return;const allowed=['image/jpeg','image/png','image/webp'];if(!allowed.includes(file.type)||file.size>2*1024*1024){input.value='';note(document.documentElement.lang==='ar'?'اختر صورة JPG أو PNG أو WebP لا تتجاوز 2MB.':'Choisissez une image JPG, PNG ou WebP de 2 Mo maximum.',true);return}const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const size=480,scale=Math.min(size/image.width,size/image.height,1),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);cvPhotoData=canvas.toDataURL('image/jpeg',.82);render()};image.onerror=()=>note(document.documentElement.lang==='ar'?'تعذر قراءة الصورة.':'Impossible de lire cette image.',true);image.src=String(reader.result)};reader.readAsDataURL(file)};
  const originalBody=cvBody;cvBody=function(){const body=originalBody();body.data.photo=cvPhotoData;return body};
  const originalLoad=window.loadCvIntoForm;window.loadCvIntoForm=function(cv){originalLoad(cv);cvPhotoData=String(cv?.data?.photo||'');input.value='';render()};
  const originalNew=window.newCvFinal;window.newCvFinal=function(){originalNew();cvPhotoData='';input.value='';render()};
  const originalPreview=window.updateCvPreview;window.updateCvPreview=function(){originalPreview();const box=document.getElementById('cvPreview');if(!box)return;box.classList.toggle('has-photo',Boolean(cvPhotoData));if(cvPhotoData){const photo=document.createElement('img');photo.className='cv-photo-preview';photo.src=cvPhotoData;photo.alt=document.documentElement.lang==='ar'?'الصورة الشخصية':'Photo personnelle';box.appendChild(photo)}};
  new MutationObserver(()=>{translate();window.updateCvPreview()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  render();
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Optional CV photo patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Added an optional compressed CV photo with preview and PDF support.');
