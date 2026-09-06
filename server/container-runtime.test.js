import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root=path.resolve(import.meta.dirname,'..');
const dockerfile=fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
const dockerignore=fs.readFileSync(path.join(root,'.dockerignore'),'utf8');

test('production container drops root while keeping runtime build paths writable',()=>{
  assert.match(dockerfile,/COPY --from=deps --chown=node:node \/app\/node_modules \.\/node_modules/);
  assert.match(dockerfile,/COPY --chown=node:node server \.\/server/);
  assert.match(dockerfile,/COPY --chown=node:node public \.\/public/);
  assert.match(dockerfile,/chown -R node:node \/data/);
  const userIndex=dockerfile.indexOf('USER node');
  const cmdIndex=dockerfile.indexOf('CMD ["npm","start"]');
  assert.ok(userIndex>0,'Dockerfile must select the node user');
  assert.ok(cmdIndex>userIndex,'runtime command must execute after dropping root');
  assert.doesNotMatch(dockerfile.slice(userIndex),/^USER root$/m);
});

test('container context excludes local secrets and mutable data',()=>{
  const ignored=new Set(dockerignore.split(/\r?\n/).map(line=>line.trim()).filter(Boolean));
  for(const entry of ['.env','node_modules','data','backups','.git'])assert.ok(ignored.has(entry),`missing .dockerignore entry: ${entry}`);
});
