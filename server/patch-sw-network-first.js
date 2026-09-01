import fs from 'fs';
import path from 'path';

const swPath = path.resolve('public/sw.js');
if (!fs.existsSync(swPath)) process.exit(0);

const sw = `const VERSION='cv-france-v20-disable-sw-20260901-1';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())await caches.delete(key);
    await self.clients.claim();
    try{await self.registration.unregister()}catch{}
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{await client.navigate(client.url)}catch{}
    }
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request,{cache:'no-store'}));
});
`;
fs.writeFileSync(swPath, sw, 'utf8');
console.log('Temporarily disabled service worker caching and cleared all caches.');
