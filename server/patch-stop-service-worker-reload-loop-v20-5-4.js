import fs from 'fs';
import path from 'path';

const file=path.resolve('public/index.html');
let html=fs.readFileSync(file,'utf8');
const marker='STOP_SERVICE_WORKER_RELOAD_LOOP_V20_5_4';

html=html.replace(
  "if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});",
  ''
);

if(!html.includes(marker)){
  const patch=String.raw`
<script>/* STOP_SERVICE_WORKER_RELOAD_LOOP_V20_5_4 */
(function(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.getRegistrations()
    .then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))
    .catch(()=>{});
})();
</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
}

if(!html.includes(marker))throw new Error('Service worker reload-loop patch failed');
if(html.includes("navigator.serviceWorker.register('/sw.js')"))throw new Error('Service worker registration is still active');
fs.writeFileSync(file,html,'utf8');
console.log('Removed the service worker reload loop.');
