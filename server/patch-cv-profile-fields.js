import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

// Keep phone numbers and email addresses left-to-right even in the Arabic UI.
html = html.replace(
  '</style>',
  `html[dir="rtl"] input.ltr-field{direction:ltr!important;text-align:left!important;unicode-bidi:plaintext!important}.cv-contact{display:flex;flex-wrap:wrap;gap:.35em;align-items:center}.cv-contact .ltr-piece{direction:ltr;unicode-bidi:isolate}.cv-contact .rtl-piece{direction:rtl;unicode-bidi:isolate}html[dir="rtl"] .cv-contact{justify-content:flex-start}</style>`
);

// Add professional identity/contact fields after the target job field.
html = html.replace(
  '<input id="cvRole" data-ph="targetJob" placeholder="Métier recherché">',
  '<input id="cvRole" data-ph="targetJob" placeholder="Métier recherché"><div class="grid"><input id="cvFullName" data-ph="fullName" placeholder="Nom et prénom"><input id="cvPhone" class="ltr-field" inputmode="tel" data-ph="phone" placeholder="Téléphone"></div><div class="grid"><input id="cvEmail" class="ltr-field" type="email" data-ph="cvEmail" placeholder="E-mail"><input id="cvAddress" data-ph="address" placeholder="Ville / Adresse"></div>'
);

// Add education and languages after skills.
html = html.replace(
  '<textarea id="cvSkills" data-ph="skills" placeholder="Compétences"></textarea>',
  '<textarea id="cvSkills" data-ph="skills" placeholder="Compétences"></textarea><textarea id="cvEducation" data-ph="education" placeholder="Formation / Études"></textarea><textarea id="cvLanguages" data-ph="languages" placeholder="Langues"></textarea>'
);

// French translations.
html = html.replace(
  "skills:'Compétences',title:'Titre'",
  "skills:'Compétences',fullName:'Nom et prénom',phone:'Téléphone',cvEmail:'E-mail',address:'Ville / Adresse',education:'Formation / Études',languages:'Langues',previewContact:'Coordonnées',previewEducation:'Formation',previewLanguages:'Langues',title:'Titre'"
);

// Arabic translations.
html = html.replace(
  "skills:'المهارات',title:'العنوان'",
  "skills:'المهارات',fullName:'الاسم الكامل',phone:'الهاتف',cvEmail:'البريد الإلكتروني',address:'المدينة / العنوان',education:'الدراسة / التكوين',languages:'اللغات',previewContact:'معلومات الاتصال',previewEducation:'الدراسة والتكوين',previewLanguages:'اللغات',title:'العنوان'"
);

const override = String.raw`
function cvSection(parent,title,text){if(!text)return;let h=document.createElement('h2');h.textContent=title;let p=document.createElement('p');p.textContent=text;parent.appendChild(h);parent.appendChild(p)}
function appendContactPiece(parent,text,cls){if(!text)return;if(parent.children.length){let sep=document.createElement('span');sep.textContent=' · ';sep.setAttribute('aria-hidden','true');parent.appendChild(sep)}let span=document.createElement('span');span.className=cls;span.textContent=text;parent.appendChild(span)}
function updateCvPreview(){let box=$('cvPreview');if(!box)return;let template=$('cvTemplate')?$('cvTemplate').value:'classic';box.className='cv-preview '+template;box.textContent='';let name=v('cvFullName');let role=v('cvRole');let email=v('cvEmail');let phone=v('cvPhone');let address=v('cvAddress');let profile=v('cvProfile');let experience=v('cvExperience');let skills=v('cvSkills');let education=v('cvEducation');let languages=v('cvLanguages');let title=document.createElement('h1');title.textContent=name||(lang==='ar'?'سيرتي الذاتية':'Mon CV');box.appendChild(title);if(role){let rp=document.createElement('p');rp.style.fontWeight='700';rp.textContent=role;box.appendChild(rp)}if(email||phone||address){let cp=document.createElement('p');cp.className='muted cv-contact';cp.dir='ltr';appendContactPiece(cp,email,'ltr-piece');appendContactPiece(cp,phone,'ltr-piece');if(address){let addr=document.createElement('span');if(cp.children.length){let sep=document.createElement('span');sep.textContent=' · ';sep.setAttribute('aria-hidden','true');cp.appendChild(sep)}addr.className=lang==='ar'?'rtl-piece':'ltr-piece';addr.dir=lang==='ar'?'rtl':'ltr';addr.textContent=address;cp.appendChild(addr)}box.appendChild(cp)}let any=role||email||phone||address||profile||experience||skills||education||languages;if(!any){let p=document.createElement('p');p.className='empty';p.textContent=T[lang].previewEmpty;box.appendChild(p);return}cvSection(box,T[lang].previewProfile,profile);cvSection(box,T[lang].previewExperience,experience);cvSection(box,T[lang].previewSkills,skills);cvSection(box,T[lang].previewEducation,education);cvSection(box,T[lang].previewLanguages,languages)}
saveCv=async function(){let body={title:v('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV'),targetRole:v('cvRole'),data:{template:$('cvTemplate')?$('cvTemplate').value:'classic',fullName:v('cvFullName'),phone:v('cvPhone'),email:v('cvEmail'),address:v('cvAddress'),jobTitle:v('cvRole'),profile:v('cvProfile'),experience:v('cvExperience'),skills:v('cvSkills'),education:v('cvEducation'),languages:v('cvLanguages')}};let r=await fetch(A+'/cvs',{method:'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)return note(d.error,true);note(T[lang].cvSaved);loadCvs();loadDashboard()};
['cvFullName','cvPhone','cvEmail','cvAddress','cvEducation','cvLanguages'].forEach(id=>{let el=$(id);if(el)el.addEventListener('input',updateCvPreview)});
`;

html = html.replace('applyLang();health();me();', override + 'applyLang();health();me();');

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied professional CV profile fields patch.');
}
