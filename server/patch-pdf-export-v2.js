import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;

const oldPrint = '@page{size:A4;margin:0}@media print{body *{visibility:hidden!important}#cvPreview,#cvPreview *{visibility:visible!important}#cvPreview{position:absolute!important;left:0!important;top:0!important;width:210mm!important;min-height:297mm!important;margin:0!important;padding:18mm!important;box-sizing:border-box!important;box-shadow:none!important;background:#fff!important;border:none!important}html[dir="rtl"] #cvPreview{right:0!important;left:auto!important}}';
const newPrint = '@page{size:A4 portrait;margin:12mm}@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}header{display:none!important}main{max-width:none!important;margin:0!important;padding:0!important}main>div,main>section{display:none!important}#cv{display:block!important}#cv>.card{display:block!important;border:0!important;margin:0!important;padding:0!important;background:#fff!important}#cv>.card>input,#cv>.card>textarea,#cv>.card>label,#cv>.card>select,#cv>.card>button,#cvList{display:none!important}#cv>.card>.template-row{display:block!important;margin:0!important}#cv>.card>.template-row>div:first-child{display:none!important}#cvPreview{display:block!important;position:static!important;width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-sizing:border-box!important;box-shadow:none!important;background:#fff!important;border:none!important}#cvPreview.classic{border-top:6px solid #111827!important;padding-top:12mm!important}#cvPreview.modern{border-left:10px solid #111827!important;padding:12mm!important}html[dir="rtl"] #cvPreview.modern{border-left:0!important;border-right:10px solid #111827!important}#cvPreview.elegant{border:0!important;padding:10mm!important}}';

html = html.replace(oldPrint, newPrint);

if (html !== before) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Applied PDF single-page print fix.');
}
