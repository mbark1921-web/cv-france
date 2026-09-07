import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

for (const script of ['patch-cv-preview-events.js', 'patch-jovelya-brand-v20-7-0.js']) {
  test(`${script} does not accumulate handlers or styles on repeated builds`, () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-patch-repeat-'));
    try {
      fs.mkdirSync(path.join(scratch, 'public'));
      const file = path.join(scratch, 'public/index.html');
      fs.writeFileSync(file, '<html><head><title>CV France v20.7.0</title><style></style></head><body><script>applyLang();health();me();</script></body></html>');
      const run = () => {
        const result = spawnSync(process.execPath, [path.join(import.meta.dirname, script)], { cwd: scratch, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
        return fs.readFileSync(file, 'utf8');
      };
      const first = run();
      assert.equal(run(), first);
      assert.equal(run(), first);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });
}
