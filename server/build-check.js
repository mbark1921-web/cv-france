// Build qualification only: never starts the application or loads service credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { filesUnder, checkBrowserScripts } from './check-browser-syntax.js';

const root = path.resolve(import.meta.dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-build-check-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|HOME|USERPROFILE|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|NODE_EXTRA_CA_CERTS)$/i.test(key)));
Object.assign(env, { NODE_ENV: 'test', APP_STAGE: 'test', DOTENV_CONFIG_PATH: path.join(scratch, 'absent.env') });
function run(file, cwd, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], {
    cwd, env, windowsHide: true, encoding: 'utf8', timeout: 60000
  });
  if (result.status !== 0) throw new Error(`Build failed: ${file}\n${result.error?.message || ''}\n${result.stderr || result.stdout}`);
}
try {
  let previous;
  for (let pass = 0; pass < 2; pass++) {
    const build = path.join(scratch, String(pass));
    fs.mkdirSync(build);
    for (const name of ['server', 'public', 'package.json', 'render.yaml']) {
      fs.cpSync(path.join(root, name), path.join(build, name), { recursive: true });
    }
    for (const file of filesUnder(build)) {
      if (/\.(js|mjs|cjs|html|json|sql|yaml|xml)$/.test(file)) {
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
      }
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(build, 'node_modules'), 'junction');
    const pkg = JSON.parse(fs.readFileSync(path.join(build, 'package.json'), 'utf8'));
    for (const command of [pkg.scripts['prepatch:public'], ...pkg.scripts['patch:public'].split(' && ')]) {
      if (!/^node server\/[\w-]+\.js$/.test(command)) throw new Error('Unsupported build command; review before execution.');
      run(command.slice(5), build);
    }
    run('server/release-check.js', build);
    run('server/pg-transform.js', build);
    run('--check', build, ['server/index.pg.generated.js']);
    checkBrowserScripts(path.join(build, 'public'));
    const outputs = [...filesUnder(path.join(build, 'public')), path.join(build, 'server/index.pg.generated.js')];
    const hashes = Object.fromEntries(outputs.map(file => [path.relative(build, file), createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
    if (previous) assert.deepEqual(hashes, previous, 'Fresh builds produced different output');
    previous = hashes;
  }
  console.log('Reproducible build passed: two independent builds have identical output; checkout untouched.');
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
