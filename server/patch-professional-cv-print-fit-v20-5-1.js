import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='PROFESSIONAL_CV_PRINT_FIT_V20_5_1';

if(!html.includes(marker)){
  const patch=String.raw`
<style>/* PROFESSIONAL_CV_PRINT_FIT_V20_5_1 */
@media print{
 #cvPreview.pro-template{font-size:9.5pt!important;line-height:1.28!important}
 #cvPreview.pro-template .pro-header{padding:7mm 9mm 5mm!important}
 #cvPreview.pro-template .pro-header h1{font-size:22pt!important;margin-bottom:2mm!important}
 #cvPreview.pro-template .pro-header p{margin:1mm 0!important;line-height:1.28!important}
 #cvPreview.pro-template .pro-content{grid-template-columns:38% 62%!important}
 #cvPreview.pro-template .pro-sidebar{padding:5.5mm 6mm!important}
 #cvPreview.pro-template .pro-main{padding:6mm 7mm!important}
 #cvPreview.pro-template .cv-photo-preview{width:24mm!important;height:24mm!important;margin:0 auto 5mm!important;border-width:1mm!important}
 #cvPreview.pro-template .pro-section{margin-bottom:4mm!important}
 #cvPreview.pro-template .pro-section h2{font-size:11pt!important;margin:0 0 2mm!important;padding-bottom:1.2mm!important;line-height:1.2!important}
 #cvPreview.pro-template .pro-section p{font-size:9.5pt!important;line-height:1.32!important;margin:0!important}
 #cvPreview.pro-gold .pro-header{padding-inline-start:42%!important}
 #cvPreview.pro-slate{border-top-width:3mm!important}
}
</style>`;
  html=html.replace('</head>',patch+'</head>');
}

if(!html.includes(marker))throw new Error('Professional CV print-fit patch failed');
fs.writeFileSync(file,html,'utf8');
console.log('Compacted professional CV print layout to keep standard content on one A4 page.');
