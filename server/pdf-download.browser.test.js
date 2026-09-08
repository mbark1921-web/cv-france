import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const root = path.resolve(import.meta.dirname, '..');
let scratch, html, browser;
before(async () => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-pdf-test-'));
  for (const name of ['server', 'public', 'package.json', 'render.yaml']) fs.cpSync(path.join(root, name), path.join(scratch, name), { recursive: true });
  const normalize = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) normalize(file); else if (/\.(js|html|json|yaml)$/.test(file)) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')); } };
  normalize(scratch);
  const pkg = JSON.parse(fs.readFileSync(path.join(scratch, 'package.json')));
  for (let pass = 0; pass < 2; pass++) for (const command of [pkg.scripts['prepatch:public'], ...pkg.scripts['patch:public'].split(' && ')]) {
    const r = spawnSync(process.execPath, [command.slice(5)], { cwd: scratch, encoding: 'utf8', windowsHide: true }); assert.equal(r.status, 0, r.stderr || r.stdout);
  }
  html = fs.readFileSync(path.join(scratch, 'public/index.html'), 'utf8');
  assert.equal(html.split('/* PDF_DOWNLOAD_V1 */').length - 1, 1);
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (scratch) fs.rmSync(scratch, { recursive: true, force: true }); });
async function fixture(language = 'fr', failFonts = false) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 375, height: 800 } });
  const page = await context.newPage(), errors = [], unexpected = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(lang => { localStorage.setItem('cvf_lang', lang); window.print = () => { throw new Error('window.print must never be called'); }; }, language);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:32218') { unexpected.push(url.origin); return route.abort(); }
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (url.pathname.startsWith('/vendor/pdf/')) {
      if (failFonts && url.pathname.endsWith('.ttf')) return route.fulfill({ status: 503, body: 'Unavailable' });
      const file = path.join(scratch, 'public/vendor/pdf', path.basename(url.pathname));
      return route.fulfill({ contentType: file.endsWith('.js') ? 'application/javascript' : 'font/ttf', body: fs.readFileSync(file) });
    }
    let body = { ok: true };
    if (url.pathname === '/api/health') body = { ok: true, version: '20.7.0' };
    if (url.pathname === '/api/public/config') body = { registration_mode: 'open', billing_enabled: false, ai_enabled: false };
    if (url.pathname === '/api/me') return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://127.0.0.1:32218/');
  await page.locator('.nav button[data-i18n="navCv"]').click();
  await page.locator('#cvTitle').fill('Qualification');
  await page.locator('#cvFullName').fill(language === 'fr' ? 'Élodie Démonstration' : 'أمينة محمد');
  await page.locator('#cvRole').fill(language === 'fr' ? 'Chargée de projet' : 'مديرة المشاريع');
  await page.locator('#cvProfile').fill(language === 'fr' ? 'Profil professionnel de démonstration, sans données réelles.' : 'خبرة في تنظيم المشاريع والتواصل مع الفريق');
  await page.locator('#cvExperience').fill(language === 'fr' ? '2024–2026 : coordination de projets.' : 'تنسيق المشاريع وتحليل النتائج');
  await page.locator('#cvSkills').fill(language === 'fr' ? 'Organisation, analyse, communication' : 'التنظيم والتحليل والتواصل');
  await page.locator('#cvEducation').fill(language === 'fr' ? 'Formation de démonstration' : 'دراسة إدارة المشاريع');
  await page.locator('#cvLanguages').fill(language === 'fr' ? 'Français, arabe' : 'العربية والفرنسية');
  await page.locator('#cvLanguage').selectOption(language);
  return { page, async close() { await context.close(); assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); } };
}
async function download(page, name) {
  const pending = page.waitForEvent('download'); await page.locator('#pdfBtn').click(); const downloaded = await pending;
  assert.equal(downloaded.suggestedFilename(), 'Qualification.pdf');
  const file = path.join(process.env.PDF_QA_DIR || scratch, name + '.pdf'); fs.mkdirSync(path.dirname(file), { recursive: true });
  await downloaded.saveAs(file); assert.equal(await downloaded.failure(), null);
  const bytes = fs.readFileSync(file); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false });
  const pdf = await task.promise;
  let text = ''; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const box = page.getViewport({ scale: 1 }); assert.ok(Math.abs(box.width - 595.28) < 1); text += (await page.getTextContent()).items.map(x => x.str).join(' '); }
  const pages = pdf.numPages; await task.destroy(); return { text, pages };
}
for (const lang of ['fr', 'ar']) test(`real PDF download contains selectable text in every template (${lang})`, async () => {
  const f = await fixture(lang); try {
    for (const model of ['classic', 'modern', 'elegant', 'pro-ocean', 'pro-coral', 'pro-graphite', 'pro-gold', 'pro-slate']) {
      await f.page.locator('#cvTemplate').selectOption(model);
      const pdf = await download(f.page, lang + '-' + model); assert.equal(pdf.pages, 1, model);
      if (lang === 'fr') { assert.match(pdf.text, /Élodie/); assert.match(pdf.text, /Formation/); }
      else { assert.match(pdf.text.normalize('NFKC'), /أمينة محمد/); assert.match(pdf.text.normalize('NFKC'), /تنسيق المشاريع وتحليل النتائج/); }
      assert.equal(await f.page.locator('#pdfBtn').isEnabled(), true);
      assert.equal(await f.page.locator('#pdfExportStatus a[download]').count(), 1);
    }
  } finally { await f.close(); }
});
test('long CV paginates without losing its final line', async () => {
  const f = await fixture(); try {
    await f.page.locator('#cvExperience').fill(Array.from({ length: 160 }, (_, i) => 'Expérience ' + i + ' : organisation des projets et communication.').join('\n') + '\nFIN-DU-DOCUMENT');
    const pdf = await download(f.page, 'long'); assert.ok(pdf.pages > 1); assert.match(pdf.text, /FIN-DU-DOCUMENT/);
  } finally { await f.close(); }
});
test('font failure is visible, retryable and never claims a successful download', async () => {
  const f = await fixture('fr', true); try {
    const downloads = []; f.page.on('download', d => downloads.push(d));
    await f.page.locator('#pdfBtn').click(); await f.page.getByText('Impossible de générer le PDF.', { exact: false }).waitFor();
    assert.equal(downloads.length, 0); assert.equal(await f.page.locator('#pdfBtn').isEnabled(), true);
    await f.page.locator('#pdfBtn').click(); await f.page.getByText('Impossible de générer le PDF.', { exact: false }).waitFor();
    assert.equal(downloads.length, 0);
  } finally { await f.close(); }
});
