import fs from 'fs';
import path from 'path';

const swPath = path.resolve('public/sw.js');
if (!fs.existsSync(swPath)) process.exit(0);

const sw = `const C='cv-france-v20-live-20260830-1';
const APP=['/','/index.html','/manifest.json','/icon.svg'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(C).then(cache=>cache.addAll(APP)).catch(()=>{}))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==C)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'||url.pathname==='/'||url.pathname==='/index.html'){
    event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});const cache=await caches.open(C);cache.put('/index.html',fresh.clone());return fresh}catch{const cached=await caches.match('/index.html');return cached||Response.error()}})());
    return;
  }
  event.respondWith((async()=>{try{const fresh=await fetch(req);const cache=await caches.open(C);cache.put(req,fresh.clone());return fresh}catch{const cached=await caches.match(req);return cached||Response.error()}})());
});
`;
fs.writeFileSync(swPath, sw, 'utf8');
console.log('Applied network-first service worker cache policy.');
