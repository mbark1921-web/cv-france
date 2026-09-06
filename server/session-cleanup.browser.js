// Runs before application scripts so no legacy edit identity is restored first.
(() => {
  const tokenKey='cvf_token', ownerKey='cvf_state_owner';
  const preferences=new Set(['cvf_lang','cvf_theme','theme']);
  const bootToken=localStorage.getItem(tokenKey)||'';
  let leaving=false;
  const clearCaches=()=>window.caches?caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))):Promise.resolve();
  function owner(value) {
    try {
      const payload=JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      return Number.isSafeInteger(payload.id)&&payload.id>0?'user:'+payload.id:'';
    } catch {return '';}
  }
  function clearStore(storage) {
    for(const key of Object.keys(storage)) {
      if(!preferences.has(key)&&!(storage===localStorage&&key===tokenKey))storage.removeItem(key);
    }
  }
  function clearPrivateStorage() {for(const storage of [localStorage,sessionStorage])clearStore(storage);}
  // The edit-state bucket belongs to one account. Never adopt legacy/unowned IDs.
  const notice=sessionStorage.getItem('cvf_session_notice');
  const section=sessionStorage.getItem('cvf_session_section');
  sessionStorage.removeItem('cvf_session_notice');
  sessionStorage.removeItem('cvf_session_section');
  for(const storage of [localStorage,sessionStorage]) {
    if(!owner(bootToken)||storage.getItem(ownerKey)!==owner(bootToken))clearStore(storage);
    if(owner(bootToken))storage.setItem(ownerKey,owner(bootToken));
  }
  clearCaches().catch(()=>{});

  window.resetUserSession=function(nextToken='',message='') {
    if(leaving)return;
    leaving=true;
    const visible=document.querySelector('main section:not(.hidden)')?.id;
    // Hide synchronously; the new document discards every closure, form and timer.
    document.documentElement.style.visibility='hidden';
    if(typeof token!=='undefined')token='';
    clearPrivateStorage();
    if(nextToken)localStorage.setItem(tokenKey,nextToken);else localStorage.removeItem(tokenKey);
    if(owner(nextToken))for(const storage of [localStorage,sessionStorage])storage.setItem(ownerKey,owner(nextToken));
    if(message)sessionStorage.setItem('cvf_session_notice',message);
    if(visible)sessionStorage.setItem('cvf_session_section',visible);
    // The application does not intentionally persist personal Cache API content.
    clearCaches().catch(()=>{}).finally(()=>location.reload());
  };
  const stale=()=>leaving||(localStorage.getItem(tokenKey)||'')!==bootToken;
  const discard=()=>{if(!leaving)window.resetUserSession(localStorage.getItem(tokenKey)||'');return new Promise(()=>{});};
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,options) {
    if(stale())return discard();
    let response;
    try {response=await nativeFetch(input,{...options,cache:'no-store'});}
    catch(error) {if(stale())return discard();throw error;}
    if(stale())return discard();
    // A body can resolve after the session changed, even if headers arrived before it.
    for(const method of ['json','text','blob','arrayBuffer','formData']) {
      const read=response[method].bind(response);
      response[method]=async(...args)=>{const value=await read(...args);return stale()?discard():value;};
    }
    return response;
  };
  addEventListener('storage',event=>{
    if(event.storageArea===localStorage&&(event.key===tokenKey||event.key===null)&&stale())discard();
  });
  addEventListener('pageshow',event=>{if(event.persisted)window.resetUserSession(localStorage.getItem(tokenKey)||'');});
  addEventListener('DOMContentLoaded',()=>{
    if(section&&document.getElementById(section)?.matches('main section'))show(section);
    if(notice)note(notice);
  });
})();
