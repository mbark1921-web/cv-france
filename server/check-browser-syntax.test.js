import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkBrowserScripts } from './check-browser-syntax.js';

function fixture(t) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jovelya-syntax-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('browser gate checks nested files, workers, classic scripts and modules',t=>{
  const dir=fixture(t);fs.mkdirSync(path.join(dir,'nested'));
  fs.writeFileSync(path.join(dir,'nested/worker.js'),'self.onmessage = () => {};');
  fs.writeFileSync(path.join(dir,'module.mjs'),'export const value = 1;');
  fs.writeFileSync(path.join(dir,'index.html'),'<script>const classic = 1;</script><script type="module">export const x = 1;</script><script type="application/ld+json">{"x":1}</script>');
  assert.equal(checkBrowserScripts(dir),4);
});
test('broken generated inline JavaScript exits nonzero',t=>{
  const dir=fixture(t);fs.writeFileSync(path.join(dir,'index.html'),'<script>function broken( {</script>');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./check-browser-syntax.js',import.meta.url)),dir],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/SyntaxError/);
  assert.throws(()=>checkBrowserScripts(dir),SyntaxError);
});
test('broken standalone and module scripts fail even when not linked by index.html',t=>{
  const dir=fixture(t);fs.writeFileSync(path.join(dir,'unused.js'),'const = ;');assert.throws(()=>checkBrowserScripts(dir));
  fs.unlinkSync(path.join(dir,'unused.js'));fs.writeFileSync(path.join(dir,'unused.mjs'),'export const = ;');assert.throws(()=>checkBrowserScripts(dir));
});
test('unclosed script elements fail the gate',t=>{const dir=fixture(t);fs.writeFileSync(path.join(dir,'other.html'),'<script>const x=1;');assert.throws(()=>checkBrowserScripts(dir),/unclosed/);});
