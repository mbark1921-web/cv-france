import fs from 'node:fs';
const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<script>\/\* PDF_DOWNLOAD_V1 \*\/[\s\S]*?<\/script>\s*/g, '');
const source = fs.readFileSync(new URL('./pdf-download.browser.js', import.meta.url), 'utf8');
if (!html.includes('</body></html>')) throw new Error('PDF build anchor missing');
html = html.replace('</body></html>', '<script>/* PDF_DOWNLOAD_V1 */\n' + source + '\n</script></body></html>');
fs.writeFileSync(file, html);
console.log('Installed direct local PDF download with embedded fonts.');
