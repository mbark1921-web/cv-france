import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const version = String(pkg.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid package version: ${version}`);
}

const shortVersion = version.split('.').slice(0, 2).join('.');

function replaceFile(filePath, replacements) {
  const abs = path.resolve(filePath);
  let text = fs.readFileSync(abs, 'utf8');
  const before = text;
  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value);
  }
  if (text !== before) {
    fs.writeFileSync(abs, text, 'utf8');
    console.log(`Synced version in ${filePath} -> ${version}`);
  }
}

replaceFile('server/index.js', [
  [/version:\s*"\d+\.\d+\.\d+"/, `version: "${version}"`]
]);

replaceFile('public/index.html', [
  [/<title>CV France v[\d.]+<\/title>/, `<title>CV France v${shortVersion}</title>`],
  [/<h2>CV France <small>v[\d.]+ Staging<\/small><\/h2>/, `<h2>CV France <small>v${shortVersion} Staging</small></h2>`],
  [/Cette page est la version staging v[\d.]+\./g, `Cette page est la version staging v${shortVersion}.`],
  [/هذه نسخة تجريبية v[\d.]+\./g, `هذه نسخة تجريبية v${shortVersion}.`]
]);
