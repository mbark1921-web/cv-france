const C='cv-france-v20-localized-defaults';
const A=['/','/manifest.json','/icon.svg','/privacy.html','/terms.html','/404.html'];

self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));

async function localizeAppResponse(request,response){
  const url=new URL(request.url);
  const isNavigation=request.mode==='navigate'||url.pathname==='/'||url.pathname==='/index.html';
  if(!isNavigation||!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  html=html.replace("title:v('cvTitle')||'Mon CV'","title:v('cvTitle')||(lang==='ar'?'سيرتي الذاتية':'Mon CV')");
  html=html.replace("title:v('letterTitle')||'Lettre'","title:v('letterTitle')||(lang==='ar'?'رسالة تقديم':'Lettre')");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;
  e.respondWith((async()=>{
    try{
      const fresh=await fetch(e.request);
      const cooked=await localizeAppResponse(e.request,fresh.clone());
      const cacheCopy=cooked.clone();
      caches.open(C).then(c=>c.put(e.request,cacheCopy));
      return cooked;
    }catch{
      const cached=await caches.match(e.request)||await caches.match('/');
      return localizeAppResponse(e.request,cached);
    }
  })());
});