const CACHE='np-shell-v1';
const ASSETS=['./','./index.html','./styles.css','./seed.js','./app.js','./manifest.json','https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(resp=>{if(resp.status===200){const cl=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cl))}return resp}).catch(()=>caches.match('./index.html'))))});
