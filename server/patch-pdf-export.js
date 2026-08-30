import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

html = html.replace(
  '</style>',
  `@page{size:A4;margin:0}@media print{body *{visibility:hidden!important}#cvPreview,#cvPreview *{visibility:visible!important}#cvPreview{position:absolute!important;left:0!important;top:0!important;width:210mm!important;min-height:297mm!important;margin:0!important;padding:18mm!important;box-sizing:border-box!important;box-shadow:none!important;background:#fff!important;border:none!important}html[dir="rtl"] #cvPreview{right:0!important;left:auto!important}} </style>`
);

html = html.replace(
  '<button class="primary" data-i18n="save" onclick="saveCv()">Enregistrer</button><div class="template-row">',
  '<button class="primary" data-i18n="save" onclick="saveCv()">Enregistrer</button> <button id="pdfBtn" data-i18n="pdfExport" onclick="printCvPreview()">Enregistrer en PDF</button><div class="template-row">'
);

html = html.replace(
  "previewEmpty:'Commencez à remplir le CV pour voir l’aperçu.',feedbackTitle:'Feedback bêta'",
  "previewEmpty:'Commencez à remplir le CV pour voir l’aperçu.',pdfExport:'Enregistrer en PDF',feedbackTitle:'Feedback bêta'"
);
html = html.replace(
  "previewEmpty:'ابدأ بملء السيرة الذاتية لتظهر المعاينة.',feedbackTitle:'ملاحظات النسخة التجريبية'",
  "previewEmpty:'ابدأ بملء السيرة الذاتية لتظهر المعاينة.',pdfExport:'حفظ PDF',feedbackTitle:'ملاحظات النسخة التجريبية'"
);

html = html.replace(
  "async function saveCv(){",
  "function printCvPreview(){updateCvPreview();window.print()}async function saveCv(){"
);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied PDF export patch.');
}
