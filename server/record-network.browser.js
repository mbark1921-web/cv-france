// Letters/Jobs write handling only. Session cleanup owns this document and storage.
(() => {
  const messages={
    fr:{network:'Connexion impossible. Votre saisie est conservée.',timeout:'Le délai de réponse est dépassé. Votre saisie est conservée.',server:'Le serveur est indisponible. Votre saisie est conservée.',format:'Réponse du serveur illisible. Votre saisie est conservée.',validation:'La demande a été refusée. Vérifiez les champs avant de réessayer.',auth:'Reconnectez-vous pour continuer. Votre saisie est conservée.',storage:'Impossible de protéger la nouvelle saisie localement. Aucun envoi effectué.',unknown:'Création non confirmée. Votre saisie est conservée. Vérifiez son état avant tout nouvel envoi pour éviter un doublon.',saved:'Enregistrement confirmé.',deleted:'Suppression confirmée.',refresh:'Opération confirmée, mais la liste ne peut pas être actualisée. Ne renvoyez pas la demande.',retry:'Réessayer',verify:'Vérifier l’enregistrement',reload:'Actualiser la liste',confirm:'Supprimer définitivement cet élément ?'},
    ar:{network:'تعذر الاتصال. تم الاحتفاظ بالبيانات المدخلة.',timeout:'انتهت مهلة الاستجابة. تم الاحتفاظ بالبيانات المدخلة.',server:'الخادم غير متاح. تم الاحتفاظ بالبيانات المدخلة.',format:'تعذر قراءة استجابة الخادم. تم الاحتفاظ بالبيانات المدخلة.',validation:'تم رفض الطلب. تحقق من الحقول قبل المحاولة مجدداً.',auth:'سجّل الدخول مجدداً للمتابعة. تم الاحتفاظ بالبيانات المدخلة.',storage:'تعذر حفظ الطلب محلياً لحمايته. لم يتم إرساله.',unknown:'لم يتم تأكيد الإنشاء. تم الاحتفاظ بالبيانات المدخلة. تحقق من حالته قبل الإرسال مجدداً لتجنب التكرار.',saved:'تم تأكيد الحفظ.',deleted:'تم تأكيد الحذف.',refresh:'تم تأكيد العملية، لكن تعذر تحديث القائمة. لا ترسل الطلب مجدداً.',retry:'إعادة المحاولة',verify:'التحقق من الحفظ',reload:'تحديث القائمة',confirm:'هل تريد حذف هذا العنصر نهائياً؟'}
  };
  const text=key=>messages[lang==='ar'?'ar':'fr'][key];
  const fault=(kind,status=0)=>Object.assign(new Error(kind),{kind,status});
  const session=token;
  const current=()=>token===session&&(localStorage.getItem('cvf_token')||'')===session;
  const validId=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?Number(id):null;
  async function request(resource,method='GET',body) {
    if(!navigator.onLine)throw fault('network');
    const controller=new AbortController();let timer;
    try {
      return await Promise.race([
        (async()=>{
          const response=await fetch(A+'/'+resource,{method,headers:{...H(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
          if(!response.ok)throw fault(response.status===401||response.status===403?'auth':response.status>=500?'server':'validation',response.status);
          if(response.status===204)return {};
          try{return await response.json();}catch{throw fault('format');}
        })(),
        new Promise((_,reject)=>{timer=setTimeout(()=>{reject(fault('timeout'));controller.abort();},15000);})
      ]);
    } catch(error) {throw error.kind?error:fault('network');}
    finally {clearTimeout(timer);}
  }
  const states=[
    {key:'letters',section:'letters',save:'saveLetterFinal',remove:'deleteLetterFinal',load:'loadLettersFinal',clear:'clearLetterForm',edit:'loadLetterIntoForm',storage:'cvf_active_letter_id',getId:()=>activeLetterId,setId:id=>{activeLetterId=id;updateLetterMode();},fields:{title:'letterTitle',company:'letterCompany',targetRole:'letterRole',content:'letterContent'}},
    {key:'applications',section:'apps',save:'saveApplicationFinal',remove:'deleteApplicationFinal',load:'loadAppsFinal',clear:'clearApplicationForm',edit:'loadApplicationIntoForm',storage:'cvf_active_application_id',getId:()=>activeApplicationId,setId:id=>{activeApplicationId=id;window.activeApplicationId=id;updateApplicationMode();},fields:{company:'appCompany',role:'appRole',status:'appStatus',applied_date:'appDate',notes:'appNotes'}}
  ];
  function bodyFor(s) {
    const body=Object.fromEntries(Object.entries(s.fields).map(([field,id])=>[field,v(id)]));
    if(s.key==='letters'&&!body.title)body.title=lang==='ar'?'رسالة التقديم':'Lettre';
    return body;
  }
  function identity(s,id) {
    s.setId(id);s.creating=!id;
    try{if(id)localStorage.setItem(s.storage,String(id));else localStorage.removeItem(s.storage);}catch{}
  }
  function report(s,key,retry,label='retry') {
    if(!current())return;
    s.message={key,retry,label};
    const box=document.getElementById(s.section+'RequestStatus');box.replaceChildren();
    box.className=['saved','deleted'].includes(key)?'ok':'err';
    const p=document.createElement('p');p.textContent=text(key);box.appendChild(p);
    if(retry){const button=document.createElement('button');button.type='button';button.textContent=text(label);button.disabled=s.busy;button.onclick=retry;box.appendChild(button);}
  }
  function busy(s,value) {
    s.busy=value;
    if(value) {
      s.disabledButtons=new Map();
      document.querySelectorAll('#'+s.section+' button.primary, #'+s.section+' .record-delete, #'+s.section+'RequestStatus button').forEach(button=>{s.disabledButtons.set(button,button.disabled);button.disabled=true;});
    } else {
      for(const [button,disabled] of s.disabledButtons||[])button.disabled=disabled;
      s.disabledButtons?.clear();
      document.querySelectorAll('#'+s.section+'RequestStatus button').forEach(button=>{button.disabled=false;});
    }
  }
  function remember(s,pending) {
    if(pending) {try{localStorage.setItem(s.pendingKey,JSON.stringify(pending));}catch{throw fault('storage');}}
    else {try{localStorage.removeItem(s.pendingKey);}catch{}}
    s.pending=pending;
    if(pending)s.pendingGeneration=s.generation;
  }
  async function rows(s) {
    const data=await request(s.key);
    if(!Array.isArray(data?.[s.key]))throw fault('format');
    return data[s.key];
  }
  function matches(s,row,body) {
    return Object.keys(s.fields).every(field=>String(row[field==='targetRole'?'target_role':field]??'')===String(body[field]??''));
  }
  async function refresh(s) {
    // Validate the read before the legacy renderer (which silently ignores HTTP errors).
    await rows(s);if(await window[s.load]()===false)throw fault('network');
    Promise.resolve(loadDashboard()).catch(()=>{});
  }
  async function finish(s,key) {
    s.confirmed=key;
    report(s,key);
    try {await refresh(s);}catch {report(s,'refresh',()=>refreshOnly(s),'reload');}
  }
  async function refreshOnly(s) {
    if(s.busy||!current())return;busy(s,true);
    try{await refresh(s);report(s,s.confirmed||'saved');}catch{report(s,'refresh',()=>refreshOnly(s),'reload');}finally{busy(s,false);}
  }
  async function reconcile(s,generation) {
    const pending=s.pending;
    const candidates=(await rows(s)).filter(row=>!pending.before.includes(Number(row.id))&&validId(row.id)&&matches(s,row,pending.body));
    // Absence does not prove failure: the original POST may still be committing.
    if(candidates.length!==1){report(s,'unknown',()=>save(s),'verify');return;}
    const id=Number(candidates[0].id),pendingGeneration=s.pendingGeneration;remember(s,null);
    if(generation===s.generation&&generation===pendingGeneration){identity(s,id);s.saved={id,body:JSON.stringify(pending.body)};}
    await finish(s,'saved');
  }
  async function save(s) {
    if(s.busy||!current())return;
    if(!token){report(s,'auth');return;}
    busy(s,true);const generation=s.generation;
    try {
      if(s.pending){await reconcile(s,generation);return;}
      const body=bodyFor(s),id=s.creating?null:(validId(s.getId())||validId(localStorage.getItem(s.storage)));
      if(id&&s.saved?.id===id&&s.saved.body===JSON.stringify(body)){report(s,'saved');return;}
      let data;
      if(!id) {
        // Capture existing IDs before sending, and persist the intent before POST.
        const before=(await rows(s)).map(row=>Number(row.id));
        if(!current()||generation!==s.generation)return;
        if(!navigator.onLine)throw fault('network');
        remember(s,{body,before});
      }
      try {data=await request(s.key+(id?'/'+id:''),id?'PUT':'POST',body);}
      catch(error) {
        // An explicit client rejection is safe to correct/retry. A lost response is not.
        if(!id&&error.status>=400&&error.status<500&&error.status!==408)remember(s,null);
        throw error;
      }
      const savedId=id||validId(data?.id);
      if(!savedId)throw fault('format');
      if(!current())return;
      remember(s,null);
      if(generation!==s.generation)return;
      identity(s,savedId);s.saved={id:savedId,body:JSON.stringify(body)};
      await finish(s,'saved');
    } catch(error) {
      if(current()&&generation===s.generation)report(s,error.kind||'network',()=>save(s),s.pending?'verify':'retry');
    } finally {busy(s,false);}
  }
  async function remove(s,id,confirmed=false) {
    id=validId(id);
    if(!id||s.busy||!current()||s.deleted.has(id))return;
    if(!token){report(s,'auth');return;}
    if(!confirmed&&!confirm(text('confirm')))return;
    busy(s,true);const generation=s.generation;
    try {
      try{await request(s.key+'/'+id,'DELETE');}catch(error){if(error.status!==404)throw error;}
      if(!current())return;
      s.deleted.add(id);
      if(generation===s.generation&&Number(s.getId())===id)window[s.clear]();
      await finish(s,'deleted');
    } catch(error) {if(current())report(s,error.kind||'network',()=>remove(s,id,true));}
    finally {busy(s,false);}
  }
  for(const s of states) {
    Object.assign(s,{busy:false,generation:0,creating:false,pending:null,saved:null,deleted:new Set(),pendingKey:'cvf_pending_'+s.key+'_write'});
    const box=document.createElement('div');box.id=s.section+'RequestStatus';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
    document.getElementById(s.section).querySelector('.card').appendChild(box);
    for(const name of [s.clear,s.edit]) {
      const previous=window[name];
      window[name]=function(...args){s.generation++;s.saved=null;s.creating=name===s.clear;return previous.apply(this,args);};
    }
    window[s.save]=()=>save(s);window[s.remove]=id=>remove(s,id);
    // Catch read failures from navigation as well as post-write refreshes.
    const load=window[s.load];
    window[s.load]=async function(){
      let timer;
      try{return await Promise.race([load.apply(this,arguments),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fault('timeout')),15000);})]);}
      catch(error){report(s,error.kind||'network',()=>refreshOnly(s),'reload');return false;}
      finally{clearTimeout(timer);}
    };
    try {
      const pending=JSON.parse(localStorage.getItem(s.pendingKey)||'null');
      if(pending&&pending.body&&Array.isArray(pending.before)) {
        s.pending=pending;
        s.pendingGeneration=s.generation;
        for(const [field,id] of Object.entries(s.fields))document.getElementById(id).value=pending.body[field]??'';
        report(s,'unknown',()=>save(s),'verify');
      }
    } catch {report(s,'storage');}
  }
  saveLetter=window.saveLetterFinal;saveApp=window.saveApplicationFinal;
  // Navigation callers do not await their loaders; consume those failures here.
  loadLetters=()=>window.loadLettersFinal().catch(()=>{});loadApps=()=>window.loadAppsFinal().catch(()=>{});
  const translate=applyLang;applyLang=function(){const result=translate.apply(this,arguments);for(const s of states)if(s.message)report(s,s.message.key,s.message.retry,s.message.label);return result;};
})();
