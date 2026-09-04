import fs from 'fs';
import path from 'path';

const files = ['public/index.html', 'public/privacy.html', 'public/terms.html', 'public/mentions-legales.html'];
for (const file of files) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) continue;
  let text = fs.readFileSync(abs, 'utf8');
  text = text.replaceAll('CV France', 'Jovelya');
  fs.writeFileSync(abs, text, 'utf8');
}

const indexPath = path.resolve('public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<title>Jovelya v[\d.]+<\/title>/, '<title>Jovelya — Votre carrière, simplement.</title>');
html = html.replace(/<h2>Jovelya <small>v([\d.]+) Production<\/small><\/h2>/, '<h2 class="jovelya-brand">Jovelya <small>v$1 Production</small></h2>');
html = html.replace('</style>', '.jovelya-brand{font-weight:800;letter-spacing:-.02em}.jovelya-brand::first-letter{color:#6366f1}</style>');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Applied Jovelya bilingual brand v20.7.0');
