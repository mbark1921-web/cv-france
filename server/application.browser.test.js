import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

// Run: npm run test:applications. Install Chromium with npx playwright install chromium.
// An installed browser can instead be selected with PLAYWRIGHT_EXECUTABLE_PATH.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fixture;
let browser;
let html;

function run(file, ...args) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd: fixture, encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}\n${result.stdout}\n${result.stderr}`);
}

before(async () => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-applications-'));
  for (const name of ['server', 'public', 'package.json', 'render.yaml']) {
    fs.cpSync(path.join(root, name), path.join(fixture, name), { recursive: true });
  }
  // The existing build anchors expect Linux line endings. Work only on the copy.
  function normalize(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) normalize(file);
      else if (/\.(js|html|json|yaml)$/.test(file)) {
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
      }
    }
  }
  normalize(fixture);
  const pkg = JSON.parse(fs.readFileSync(path.join(fixture, 'package.json'), 'utf8'));
  for (let pass = 0; pass < 2; pass++) {
    for (const command of [pkg.scripts['prepatch:public'], ...pkg.scripts['patch:public'].split(' && ')]) {
      assert.ok(command.startsWith('node '));
      run(command.slice(5));
    }
  }
  run('server/release-check.js');
  run('server/pg-transform.js');
  run('--check', 'server/index.pg.generated.js');
  html = fs.readFileSync(path.join(fixture, 'public/index.html'), 'utf8');
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
});

after(async () => {
  await browser?.close();
  if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
});

test('all generated browser scripts parse after two full build passes', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for (const [i, match] of scripts.entries()) new vm.Script(match[1], { filename: `browser-script-${i}.js` });
});

test('an already-generated malformed Jobs block is repaired in place', () => {
  const file = path.join(fixture, 'public/index.html');
  const pattern = /<script>\/\* APPLICATION_REAL_UPDATE_V20_6_0 \*\/[\s\S]*?<\/script>/;
  const malformed = html.replace(pattern, block => block.replace(/\n/g, '\\n'));
  assert.notEqual(malformed, html);
  fs.writeFileSync(file, malformed);
  run('server/patch-application-real-update-v20-6-0.js');
  assert.equal(fs.readFileSync(file, 'utf8'), html);
  run('server/patch-application-update-runtime-v20-6-2.js');
  const once = fs.readFileSync(file, 'utf8');
  run('server/patch-application-update-runtime-v20-6-2.js');
  assert.equal(fs.readFileSync(file, 'utf8'), once);
});

for (const language of ['fr', 'ar']) {
  test(`editing 7 → New → Save creates 8 without changing 7 (${language})`, async () => {
    const original = { id: 7, company: 'Original company', role: 'Original role', status: 'Envoyée', applied_date: '2026-09-01', notes: 'Keep this record' };
    const records = new Map([[7, structuredClone(original)]]);
    const writes = [];
    const errors = [];
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('cvf_token', 'test-token'));
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
      let data = { ok: true };
      if (url.pathname === '/api/me') data = { user: { id: 1, email: 'test@example.com', email_verified: true, plan: 'free' } };
      if (url.pathname === '/api/public/config') data = { registration_mode: 'open', billing_enabled: false, ai_enabled: false };
      if (url.pathname === '/api/cvs') data = { cvs: [] };
      if (url.pathname === '/api/letters') data = { letters: [] };
      if (url.pathname.startsWith('/api/applications')) {
        if (method === 'GET') data = { applications: [...records.values()] };
        else {
          const body = request.postDataJSON();
          writes.push({ method, path: url.pathname, body });
          const id = method === 'POST' ? 8 : Number(url.pathname.split('/').pop());
          records.set(id, { ...body, id });
          data = { ok: true, id };
        }
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    try {
      await page.goto('http://jovelya.test/');
      await page.evaluate(l => { lang = l; applyLang(); }, language);
      await page.locator('[data-i18n="navApps"]').click();
      await page.locator('[data-application-id="7"] .record-actions button').first().click();
      assert.equal(await page.locator('#appCompany').inputValue(), original.company);
      assert.equal(await page.evaluate(() => localStorage.getItem('cvf_active_application_id')), '7');
      await page.locator('#newApplicationButton').click();
      assert.deepEqual(await page.evaluate(() => ({ live: activeApplicationId, runtime: window.activeApplicationId, stored: localStorage.getItem('cvf_active_application_id') })), { live: null, runtime: null, stored: null });
      await page.locator('#appCompany').fill('New company');
      await page.locator('#appRole').fill('New role');
      await page.locator('#apps button.primary').click();
      await page.locator('[data-application-id="8"]').waitFor();
      assert.deepEqual(writes.map(({ method, path }) => ({ method, path })), [{ method: 'POST', path: '/api/applications' }]);
      assert.deepEqual(records.get(7), original);
      assert.equal(records.get(8).company, 'New company');
      assert.equal(records.size, 2);
      // Saving again edits the newly created record, never application 7.
      await page.locator('#appCompany').fill('New company updated');
      await page.locator('#apps button.primary').click();
      await page.waitForFunction(() => document.querySelector('[data-application-id="8"]').textContent.includes('New company updated'));
      assert.equal(writes.at(-1).method, 'PUT');
      assert.equal(writes.at(-1).path, '/api/applications/8');
      assert.deepEqual(records.get(7), original);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}
