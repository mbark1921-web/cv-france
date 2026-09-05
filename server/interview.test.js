import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const server = path.dirname(fileURLToPath(import.meta.url));

function fixture(run) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'cv-france-interview-'));
  mkdirSync(path.join(cwd, 'public'));
  const file = path.join(cwd, 'public/index.html');
  const patch = name => {
    const result = spawnSync(process.execPath, [path.join(server, name)], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try { run({ file, patch }); } finally { rmSync(cwd, { recursive: true, force: true }); }
}

const button = '<button data-i18n="navInterview" onclick="show(\'interview\')">Interview</button>';
const analyze = '<button data-i18n="analyze" onclick="analyzeAts()">ATS</button>';
const feedback = 'async function sendFeedback(){}';

test('ATS preserves Interview and neighboring workflows on repeated patch passes', () => {
  for (const navigation of ['', 'function openInterviewPanel(){return "navigation preserved";}']) {
    fixture(({ file, patch }) => {
      const interview = navigation + 'function generateInterview(){return "generator preserved";}';
      const before = 'function saveCv(){return "cv";}function saveLetter(){return "letter";}function saveApp(){return "job";}';
      writeFileSync(file, `${button}${analyze}<script>${before}function analyzeAts(){}${interview}${feedback}</script>`);
      for (let pass = 0; pass < 2; pass++) {
        patch('patch-ats-direct-v20-2-9.js');
        const html = readFileSync(file, 'utf8');
        assert.ok(html.includes(before));
        assert.ok(html.includes(interview), 'ATS deleted Interview code');
        assert.ok(html.includes(feedback));
        assert.equal(html.split('function analyzeAts(){').length - 1, 1);
        new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
      }
    });
  }
});

test('legacy pages restore a working French/Arabic generator and retain it after ATS reruns', () => {
  fixture(({ file, patch }) => {
    writeFileSync(file, `${button}${analyze}<script>function analyzeAts(){}${feedback}</script>`);
    patch('patch-ats-direct-v20-2-9.js');
    patch('patch-interview-restore-v20-2-9.js');
    const restored = readFileSync(file, 'utf8');
    patch('patch-ats-direct-v20-2-9.js');
    patch('patch-interview-restore-v20-2-9.js');
    assert.equal(readFileSync(file, 'utf8'), restored);
    let role = '';
    let notice;
    const element = () => ({ children: [], textContent: '', append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.append(node); }, replaceChildren() { this.children = []; } });
    const box = element();
    const context = vm.createContext({
      lang: 'fr', T: { fr: { interviewRoleError: 'Poste requis' }, ar: { interviewRoleError: 'الوظيفة مطلوبة' } },
      v: () => role.trim(), $: () => box, note: (text, error) => { notice = { text, error }; },
      document: { createElement: element }
    });
    vm.runInContext(restored.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    for (const language of ['fr', 'ar']) {
      context.lang = language;
      role = '   ';
      vm.runInContext('generateInterview()', context);
      assert.deepEqual(notice, { text: context.T[language].interviewRoleError, error: true });
      for (const target of ['Vendeur', 'Développeur', 'موظف متجر', '<img src=x onerror=alert(1)>']) {
        role = target;
        vm.runInContext('generateInterview()', context);
        assert.equal(box.children.length, 6, 'repeat clicks must replace, not append');
        assert.ok(box.children[0].children[0].textContent.includes(target));
        assert.ok(box.children.every(item => item.children.length === 2 && item.children[1].textContent));
      }
    }
  });
});
