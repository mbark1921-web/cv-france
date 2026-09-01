import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');

if(!html.includes('function generateInterview(){')){
  const fn=String.raw`function generateInterview(){
    const role=v('interviewRole');
    if(!role)return note(T[lang].interviewRoleError,true);
    const retail=/polyvalent|commerce|vente|vendeur|vendeuse|magasin|rayon|caisse|موظف|متعدد|المهام|متجر|الزبائن|المنتجات|المخزون/i.test(role);
    let qa;
    if(lang==='ar'){
      qa=retail?[
        ['عرّف بنفسك ولماذا أنت مناسب لوظيفة '+role+'؟','أنا شخص جاد ومنظم وأحب خدمة الزبائن والعمل ضمن فريق. لدي خبرة في التجارة وترتيب المنتجات ومراقبة المخزون، وأتعلم بسرعة وأحترم التعليمات.'],
        ['كيف تستقبل زبوناً داخل المتجر؟','أرحب به باحترام، أستمع إلى طلبه، أساعده في إيجاد المنتج المناسب وأتأكد من أنه حصل على المعلومة التي يحتاجها.'],
        ['ماذا تفعل إذا كان هناك ضغط وكثرة مهام في نفس الوقت؟','أرتب الأولويات، أبدأ بالمهام العاجلة وخدمة الزبائن، ثم أواصل ترتيب الرفوف والمخزون بهدوء وتنظيم مع التواصل مع الفريق.'],
        ['كيف تتعامل مع ترتيب الرفوف وإعادة تزويد المنتجات؟','أحافظ على نظافة وترتيب الرفوف، أراقب النواقص، أعيد التزويد بشكل منظم وأتحقق من عرض المنتجات بطريقة واضحة وآمنة.'],
        ['كيف تتصرف إذا لاحظت نقصاً أو خطأ في المخزون؟','أتحقق من المعلومة أولاً، ثم أبلغ المسؤول وأتبع الإجراء الداخلي لتصحيح المخزون وتفادي تكرار الخطأ.'],
        ['ما هي نقاط قوتك في العمل الجماعي؟','الاحترام، الالتزام، التواصل الواضح، مساعدة الزملاء والقدرة على التكيف مع المهام المختلفة حسب حاجة المتجر.']
      ]:[
        ['عرّف بنفسك باختصار ولماذا تريد وظيفة '+role+'؟','أقدم خبرتي ونقاط قوتي المرتبطة بالوظيفة، وأوضح أنني مهتم بالمجال ومستعد للتعلم وتحمل المسؤولية.'],
        ['لماذا يجب أن نختارك لهذا المنصب؟','أركز على الجدية والانضباط والقدرة على التعلم والعمل ضمن فريق، مع مثال قصير من خبرتي السابقة.'],
        ['ما هي أهم نقاط قوتك؟','أذكر نقطتين أو ثلاثاً مرتبطة بالوظيفة مثل التنظيم، التواصل، الالتزام أو حل المشكلات.'],
        ['كيف تتعامل مع موقف صعب في العمل؟','أحافظ على الهدوء، أفهم المشكلة، أبحث عن حل عملي وأتواصل مع المسؤول أو الفريق عند الحاجة.'],
        ['حدثنا عن تجربة عمل جماعي ناجحة.','أشرح الموقف، دوري داخل الفريق، ما الذي قمنا به والنتيجة التي حققناها معاً.'],
        ['أين ترى نفسك بعد بضع سنوات؟','أريد تطوير مهاراتي، اكتساب خبرة أكبر وتحمل مسؤوليات إضافية داخل المجال.']
      ];
    }else{
      qa=retail?[
        ['Présentez-vous et expliquez pourquoi vous êtes adapté au poste de '+role+'.',"Je suis une personne sérieuse, organisée et orientée service client. J'ai une expérience du commerce, de la mise en rayon et du suivi du stock, et je m'adapte rapidement aux besoins de l'équipe."],
        ['Comment accueillez-vous un client en magasin ?',"Je le salue, j'écoute sa demande, je l'oriente vers le bon produit et je m'assure qu'il a obtenu l'information dont il a besoin."],
        ['Comment gérez-vous plusieurs tâches en même temps ?','Je fixe les priorités, je traite d’abord les urgences et les clients, puis je poursuis les tâches de rayon et de stock de façon organisée.'],
        ['Comment gérez-vous la mise en rayon et le réassort ?','Je garde le rayon propre et ordonné, je repère les ruptures, je réapprovisionne correctement et je vérifie la présentation des produits.'],
        ['Que faites-vous si vous constatez une erreur ou un manque de stock ?',"Je vérifie l'information, j'en informe le responsable et j'applique la procédure prévue pour corriger l'écart."],
        ['Quelles sont vos qualités pour travailler en équipe ?','Je suis respectueux, ponctuel, disponible pour aider mes collègues et capable de m’adapter aux différentes tâches.']
      ]:[
        ['Présentez-vous brièvement et expliquez pourquoi vous visez le poste de '+role+'.','Je présente mon expérience et mes qualités les plus utiles pour ce poste, puis ma motivation.'],
        ['Pourquoi devrions-nous vous choisir ?','Je mets en avant mon sérieux, ma capacité d’apprentissage et mon sens des responsabilités.'],
        ['Quelles sont vos principales qualités ?','Je cite deux ou trois qualités directement utiles au poste, avec un exemple bref.'],
        ['Comment réagissez-vous face à une difficulté au travail ?','Je reste calme, j’analyse la situation et je cherche une solution pratique.'],
        ["Parlez-moi d'une expérience réussie en équipe.",'Je décris la situation, mon rôle, les actions menées et le résultat obtenu.'],
        ['Où vous voyez-vous dans quelques années ?','Je souhaite développer mes compétences et prendre progressivement davantage de responsabilités.']
      ];
    }
    const box=$('interviewResult');
    box.replaceChildren();
    qa.forEach((item,i)=>{
      const d=document.createElement('div');d.className='interview-item';
      const h=document.createElement('h4');h.textContent=(i+1)+'. '+item[0];
      const p=document.createElement('p');p.textContent=item[1];
      d.append(h,p);box.appendChild(d);
    });
  }`;
  html=html.replace('async function sendFeedback(){',fn+'async function sendFeedback(){');
}

// Keep the interview page reachable even when later runtime patches wrap or
// replace the shared show() function. The previous restore only reinstated the
// generator, so the navigation button could remain visible without opening the
// interview section.
if(!html.includes('function openInterviewPanel(){')){
  const openInterview=String.raw`function openInterviewPanel(){
    document.querySelectorAll('main section').forEach(section=>section.classList.add('hidden'));
    const section=$('interview');
    if(!section)return;
    section.classList.remove('hidden');
    if(typeof window.preparePrimaryWorkflow==='function'){
      setTimeout(()=>window.preparePrimaryWorkflow('interview'),0);
    }
  }`;
  html=html.replace('function generateInterview(){',openInterview+'function generateInterview(){');
}

html=html.replace(
  /(<button[^>]*data-i18n="navInterview"[^>]*onclick=")show\('interview'\)("[^>]*>)/,
  '$1openInterviewPanel()$2'
);

if(!html.includes('function generateInterview(){')||
   !html.includes('function openInterviewPanel(){')||
   !html.includes('onclick="openInterviewPanel()"')){
  throw new Error('Interview restore failed');
}
fs.writeFileSync(file,html,'utf8');
console.log('Restored interview question generator after ATS patch.');
