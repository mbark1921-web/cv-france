import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');

function keepFirstExact(pattern,label){
  let seen=false;
  html=html.replace(pattern,match=>{
    if(!seen){seen=true;return match;}
    return '';
  });
  if(!seen)throw new Error(`Missing generated UI block: ${label}`);
}

keepFirstExact(
  /<div class="grid"><input id="cvFullName"[\s\S]*?<input id="cvAddress"[^>]*><\/div>/g,
  'CV contact fields'
);
keepFirstExact(
  /<textarea id="cvEducation"[\s\S]*?<\/textarea><textarea id="cvLanguages"[\s\S]*?<\/textarea>/g,
  'CV education and languages fields'
);
keepFirstExact(
  /<section id="interview" class="hidden">[\s\S]*?<\/section>/g,
  'interview section'
);

const uniqueIds=['cvFullName','cvPhone','cvEmail','cvAddress','cvEducation','cvLanguages','interview','interviewRole','interviewResult'];
for(const id of uniqueIds){
  const count=(html.match(new RegExp(`id="${id}"`,'g'))||[]).length;
  if(count!==1)throw new Error(`Expected one #${id}, found ${count}`);
}

fs.writeFileSync(file,html,'utf8');
console.log('Removed duplicate generated CV and interview UI blocks.');
