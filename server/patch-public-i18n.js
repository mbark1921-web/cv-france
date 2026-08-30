import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
const swPath = path.resolve('public/sw.js');

let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

html = html.replace(
  "title:v('cvTitle')||'Mon CV'",
  "title:v('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV')"
);
html = html.replace(
  "title:v('letterTitle')||'Lettre'",
  "title:v('letterTitle')||(lang==='ar'?'رسالة التقديم':'Lettre')"
);

const atsNeedle = "function normWord(s){return String(s||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim()}function atsTokens(text){return String(text||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\p{L}\\p{N}+#]+/gu,' ').split(/\\s+/).map(normWord).filter(w=>w.length>=3&&!ATS_STOP.has(w))}";
const atsReplacement = "const ATS_GENERIC=new Set(['recherchons','recherche','rechercher','recherchez','assurer','assure','assurent','bon','bonne','bons','bonnes','apprecie','apprecies','appreciee','appreciees','souhaite','souhaitons','requis','requise','requises','necessaire','necessaires','ideal','ideale','ideales','principal','principale','principales','notamment','egalement','capable','capacite','faire','fait','mettre','permettre','participer','contribuer','rejoindre','rejoignez','proposer','propose','offrir','offre','selon','grace','aupres','ainsi','etre','avoir']);function normWord(s){return String(s||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim()}function atsTokens(text){return String(text||'').toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\p{L}\\p{N}+#]+/gu,' ').split(/\\s+/).map(normWord).filter(w=>w.length>=3&&!ATS_STOP.has(w)&&!ATS_GENERIC.has(w))}";
html = html.replace(atsNeedle, atsReplacement);

html = html.replace(
  ".ats-panel{border:1px solid #e1e5ea;border-radius:14px;padding:14px}",
  ".ats-panel{border:1px solid #e1e5ea;border-radius:14px;padding:14px}.interview-item{border:1px solid #e1e5ea;border-radius:14px;padding:14px;margin:12px 0}.interview-item h4{margin:0 0 8px}.interview-item p{margin:0;line-height:1.7}"
);

html = html.replace(
  '<button data-i18n="navAts" onclick="show(\'ats\')">ATS</button><button data-i18n="navFeedback"',
  '<button data-i18n="navAts" onclick="show(\'ats\')">ATS</button><button data-i18n="navInterview" onclick="show(\'interview\')">Entretien</button><button data-i18n="navFeedback"'
);

html = html.replace(
  '<section id="feedback" class="hidden">',
  '<section id="interview" class="hidden"><div class="card"><h3 data-i18n="interviewTitle">Préparation entretien</h3><p class="muted" data-i18n="interviewHelp">Indiquez le poste visé pour obtenir des questions fréquentes et des réponses modèles.</p><input id="interviewRole" data-ph="interviewJob" placeholder="Poste visé"><button class="primary" data-i18n="generateQuestions" onclick="generateInterview()">Générer les questions</button><div id="interviewResult"></div></div></section><section id="feedback" class="hidden">'
);

html = html.replace(
  "navAts:'ATS',navFeedback:'Feedback'",
  "navAts:'ATS',navInterview:'Entretien',navFeedback:'Feedback'"
);
html = html.replace(
  "navAts:'ATS',navFeedback:'ملاحظات'",
  "navAts:'ATS',navInterview:'المقابلة',navFeedback:'ملاحظات'"
);

html = html.replace(
  "offerError:\"Collez une offre d'emploi suffisamment détaillée.\",feedbackTitle:'Feedback bêta'",
  "offerError:\"Collez une offre d'emploi suffisamment détaillée.\",interviewTitle:'Préparation entretien',interviewHelp:'Indiquez le poste visé pour obtenir des questions fréquentes et des réponses modèles.',interviewJob:'Poste visé',generateQuestions:'Générer les questions',interviewRoleError:'Indiquez le poste visé.',feedbackTitle:'Feedback bêta'"
);
html = html.replace(
  "offerError:'ألصق إعلان وظيفة مفصلاً بشكل كافٍ.',feedbackTitle:'ملاحظات النسخة التجريبية'",
  "offerError:'ألصق إعلان وظيفة مفصلاً بشكل كافٍ.',interviewTitle:'التحضير للمقابلة',interviewHelp:'اكتب اسم الوظيفة لتحصل على أسئلة شائعة وأجوبة نموذجية للتدرب.',interviewJob:'الوظيفة المطلوبة',generateQuestions:'توليد الأسئلة',interviewRoleError:'اكتب اسم الوظيفة أولاً.',feedbackTitle:'ملاحظات النسخة التجريبية'"
);

const interviewFn = `function generateInterview(){let role=v('interviewRole');if(!role)return note(T[lang].interviewRoleError,true);let retail=/polyvalent|commerce|vente|vendeur|vendeuse|magasin|rayon|caisse/i.test(role);let qa;if(lang==='ar'){qa=retail?[["عرّف بنفسك ولماذا أنت مناسب لوظيفة "+role+"؟","أنا شخص جاد ومنظم وأحب خدمة الزبناء والعمل ضمن فريق. لدي خبرة في التجارة وترتيب السلع والتعامل مع الزبائن، وأتعلم بسرعة وأحترم التعليمات."],["كيف تستقبل زبوناً داخل المتجر؟","أرحب به باحترام، أستمع إلى طلبه، أساعده في إيجاد المنتج المناسب وأتأكد من أنه حصل على المعلومة التي يحتاجها."],["ماذا تفعل إذا كان هناك ضغط وكثرة مهام في نفس الوقت؟","أرتب الأولويات، أبدأ بالمهام العاجلة وخدمة الزبائن، ثم أواصل ترتيب الرفوف والمخزون بهدوء وتنظيم مع التواصل مع الفريق."],["كيف تتعامل مع ترتيب الرفوف وإعادة تزويد المنتجات؟","أحافظ على نظافة وترتيب الرفوف، أراقب النواقص، أعيد التزويد بشكل منظم وأتحقق من عرض المنتجات بطريقة واضحة وآمنة."],["كيف تتصرف إذا لاحظت نقصاً أو خطأ في المخزون؟","أتحقق من المعلومة أولاً، ثم أبلغ المسؤول وأتبع الإجراء الداخلي لتصحيح المخزون وتفادي تكرار الخطأ."],["ما هي نقاط قوتك في العمل الجماعي؟","الاحترام، الالتزام، التواصل الواضح، مساعدة الزملاء والقدرة على التكيف مع المهام المختلفة حسب حاجة المتجر."]]:[["عرّف بنفسك باختصار ولماذا تريد وظيفة "+role+"؟","أقدم خبرتي ونقاط قوتي المرتبطة بالوظيفة، وأوضح أنني مهتم بالمجال ومستعد للتعلم وتحمل المسؤولية."],["لماذا يجب أن نختارك لهذا المنصب؟","أركز على الجدية والانضباط والقدرة على التعلم والعمل ضمن فريق، مع إعطاء مثال قصير من خبرتي السابقة."],["ما هي أهم نقاط قوتك؟","أذكر نقطتين أو ثلاثاً مرتبطة بالوظيفة مثل التنظيم، التواصل، الالتزام أو حل المشكلات، مع مثال بسيط لكل نقطة."],["كيف تتعامل مع موقف صعب في العمل؟","أحافظ على الهدوء، أفهم المشكلة، أبحث عن حل عملي وأتواصل مع المسؤول أو الفريق عند الحاجة."],["حدثنا عن تجربة عمل جماعي ناجحة.","أشرح الموقف، دوري داخل الفريق، ما الذي قمنا به والنتيجة التي حققناها معاً."],["أين ترى نفسك بعد بضع سنوات؟","أوضح أنني أريد تطوير مهاراتي، اكتساب خبرة أكبر وتحمل مسؤوليات إضافية داخل المجال."]] }else{qa=retail?[["Présentez-vous et expliquez pourquoi vous êtes adapté au poste de "+role+".","Je suis une personne sérieuse, organisée et orientée service client. J'ai une expérience du commerce, de la mise en rayon et de l'accueil, et je m'adapte rapidement aux besoins de l'équipe."],["Comment accueillez-vous un client en magasin ?","Je le salue, j'écoute sa demande, je l'oriente vers le bon produit et je m'assure qu'il a obtenu l'information dont il a besoin."],["Comment gérez-vous plusieurs tâches en même temps ?","Je fixe les priorités, je traite d'abord les urgences et les clients, puis je poursuis les tâches de rayon et de stock de façon organisée en communiquant avec l'équipe."],["Comment gérez-vous la mise en rayon et le réassort ?","Je garde le rayon propre et ordonné, je repère les ruptures, je réapprovisionne correctement et je vérifie que les produits sont présentés de manière claire et sûre."],["Que faites-vous si vous constatez une erreur ou un manque de stock ?","Je vérifie l'information, j'en informe le responsable et j'applique la procédure prévue pour corriger l'écart et éviter qu'il se reproduise."],["Quelles sont vos qualités pour travailler en équipe ?","Je suis respectueux, ponctuel, disponible pour aider mes collègues et capable de m'adapter aux différentes tâches selon les besoins du magasin."]]:[["Présentez-vous brièvement et expliquez pourquoi vous visez le poste de "+role+".","Je présente mon expérience et mes qualités les plus utiles pour ce poste, puis j'explique clairement ma motivation et ma volonté de progresser."],["Pourquoi devrions-nous vous choisir ?","Je mets en avant mon sérieux, ma capacité d'apprentissage, mon sens des responsabilités et un exemple concret de mon expérience."],["Quelles sont vos principales qualités ?","Je cite deux ou trois qualités directement utiles au poste, comme l'organisation, la communication ou la fiabilité, avec un exemple bref."],["Comment réagissez-vous face à une difficulté au travail ?","Je reste calme, j'analyse la situation, je cherche une solution pratique et je communique avec mon responsable ou l'équipe si nécessaire."],["Parlez-moi d'une expérience réussie en équipe.","Je décris la situation, mon rôle, les actions menées avec l'équipe et le résultat obtenu."],["Où vous voyez-vous dans quelques années ?","Je souhaite développer mes compétences, gagner en expérience et prendre progressivement davantage de responsabilités dans ce domaine."]] }let box=$('interviewResult');box.textContent='';qa.forEach((item,i)=>{let d=document.createElement('div');d.className='interview-item';let h=document.createElement('h4');h.textContent=(i+1)+'. '+item[0];let p=document.createElement('p');p.textContent=item[1];d.appendChild(h);d.appendChild(p);box.appendChild(d)})}`;
html = html.replace(
  "async function sendFeedback(){",
  interviewFn + "async function sendFeedback(){"
);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied public i18n/ATS/interview runtime patch.');
}

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace("const C='cv-france-v20'", "const C='cv-france-v20-interview1'");
  fs.writeFileSync(swPath, sw, 'utf8');
}
