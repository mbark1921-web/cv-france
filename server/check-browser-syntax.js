import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function filesUnder(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(directory,entry.name);
    return entry.isDirectory()?filesUnder(file):entry.isFile()?[file]:[];
  }).sort();
}
function parse(source,label,module=false) {
  if(!module) {new vm.Script(source,{filename:label});return;}
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  if(result.status!==0)throw new Error(`${label}: ${result.stderr}`);
}
export function checkBrowserScripts(directory) {
  const files=filesUnder(directory);let scripts=0;
  for(const file of files) {
    const text=fs.readFileSync(file,'utf8');
    if(/\.(?:js|mjs|cjs)$/.test(file)) {parse(text,file,file.endsWith('.mjs'));scripts++;}
    if(!/\.html?$/.test(file))continue;
    // Script elements use HTML raw-text rules; JSON data blocks are not JavaScript.
    const html=text.replace(/<!--[\s\S]*?-->/g,'');
    const matches=[...html.matchAll(/<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/script\s*>/gi)];
    if(matches.length !== (html.match(/<script\b/gi)||[]).length)throw new Error(`${file}: unclosed script element`);
    for(const [index,match] of matches.entries()) {
      const type=match[1].match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value=(type?.[1] ?? type?.[2] ?? type?.[3] ?? '').toLowerCase();
      if(value && !['module','text/javascript','application/javascript','text/ecmascript','application/ecmascript'].includes(value))continue;
      parse(match[2],`${file}:inline-script-${index+1}`,value==='module');scripts++;
    }
  }
  if(!scripts)throw new Error('No browser JavaScript found.');
  console.log(`Browser syntax passed: ${scripts} scripts across ${files.length} public files.`);
  return scripts;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)checkBrowserScripts(path.resolve(process.argv[2] || 'public'));
