import fs from 'fs';
import path from 'path';

const file = path.resolve('public/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'CV_LIST_RENDER_SERIAL_V20_2_9';

if (!html.includes(marker)) {
  html = html.replace(
    '</body></html>',
    `<script>/* ${marker} */
(function(){
  const originalLoadCvsFinal=window.loadCvsFinal;
  if(typeof originalLoadCvsFinal!=='function')return;
  let cvListQueue=Promise.resolve();
  window.loadCvsFinal=function(){
    cvListQueue=cvListQueue
      .catch(()=>{})
      .then(()=>originalLoadCvsFinal());
    return cvListQueue;
  };
  if(typeof loadCvs!=='undefined')loadCvs=window.loadCvsFinal;
})();
</script></body></html>`
  );
  fs.writeFileSync(file, html, 'utf8');
  console.log('Serialized CV list rendering to prevent duplicate cards.');
}
