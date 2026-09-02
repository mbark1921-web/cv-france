import fs from 'node:fs';

const htmlPath='public/index.html';
const serverPath='server/index.js';
const marker='APPLICATION_REAL_UPDATE_V20_6_0';

let server=fs.readFileSync(serverPath,'utf8');
if(!server.includes(marker)){
  const anchor='app.delete("/api/applications/:id", requireAuth, requireVerified, (req, res) => {';
  if(!server.includes(anchor))throw new Error('Application delete route anchor not found');
  const route=`/* ${marker} */\napp.put("/api/applications/:id", requireAuth, requireVerified, (req, res) => {\n  const input = parse(applicationSchema, req.body, res);\n  if (!input) return;\n\n  const id = Number(req.params.id);\n  if (!Number.isInteger(id) || id <= 0) {\n    return res.status(400).json({ error: "Identifiant invalide." });\n  }\n\n  const result = db.prepare(\`\n    UPDATE applications\n    SET company=?, role=?, status=?, applied_date=?, notes=?\n    WHERE id=? AND user_id=?\n  \`).run(\n    input.company,\n    input.role,\n    input.status,\n    input.applied_date || null,\n    input.notes || '',\n    id,\n    req.user.id\n  );\n\n  if (!result.changes) return res.status(404).json({ error: "Introuvable." });\n  res.json({ ok: true, id });\n});\n\n`;
  server=server.replace(anchor,route+anchor);
  fs.writeFileSync(serverPath,server,'utf8');
}

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes(marker)){
  const patch=String.raw`\n<script>/* APPLICATION_REAL_UPDATE_V20_6_0 */\n(function(){\n  const storageKey='cvf_active_application_id';\n  const readRemembered=()=>{const n=Number(localStorage.getItem(storageKey)||0);return Number.isInteger(n)&&n>0?n:null};\n  const remember=id=>{const n=Number(id);if(Number.isInteger(n)&&n>0)localStorage.setItem(storageKey,String(n));else localStorage.removeItem(storageKey)};\n\n  const previousLoad=window.loadApplicationIntoForm;\n  window.loadApplicationIntoForm=function(app){\n    if(typeof previousLoad==='function')previousLoad(app);\n    activeApplicationId=Number(app?.id)||null;\n    remember(activeApplicationId);\n    if(typeof updateApplicationMode==='function')updateApplicationMode();\n  };\n\n  const previousClear=window.clearApplicationForm||globalThis.clearApplicationForm;\n  window.clearApplicationForm=function(){\n    remember(null);\n    if(typeof previousClear==='function')previousClear();\n    activeApplicationId=null;\n    if(typeof updateApplicationMode==='function')updateApplicationMode();\n  };\n  globalThis.clearApplicationForm=window.clearApplicationForm;\n\n  const remembered=readRemembered();\n  if(remembered)activeApplicationId=remembered;\n\n  window.saveApplicationFinal=async function(){\n    const body={company:v('appCompany'),role:v('appRole'),status:v('appStatus'),applied_date:v('appDate'),notes:v('appNotes')};\n    const editing=Number.isInteger(activeApplicationId)&&activeApplicationId>0;\n    const endpoint=editing?A+'/applications/'+activeApplicationId:A+'/applications';\n    const r=await fetch(endpoint,{method:editing?'PUT':'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify(body)});\n    const d=await r.json();\n    if(!r.ok)return note(d.error||T[lang].serverError,true);\n    if(!editing&&d.id){activeApplicationId=Number(d.id);remember(activeApplicationId)}\n    if(editing)remember(activeApplicationId);\n    note(editing?(lang==='ar'?'تم تحديث طلب العمل':'Candidature mise à jour'):T[lang].appSaved);\n    if(typeof updateApplicationMode==='function')updateApplicationMode();\n    await window.loadAppsFinal();\n    loadDashboard();\n  };\n  saveApp=window.saveApplicationFinal;\n\n  const oldDelete=window.deleteApplicationFinal;\n  window.deleteApplicationFinal=async function(id){\n    const wasActive=Number(activeApplicationId)===Number(id);\n    if(typeof oldDelete==='function')await oldDelete(id);\n    if(wasActive){activeApplicationId=null;remember(null);if(typeof updateApplicationMode==='function')updateApplicationMode()}\n  };\n\n  setTimeout(()=>{\n    const id=readRemembered();\n    if(id){activeApplicationId=id;if(typeof updateApplicationMode==='function')updateApplicationMode()}\n  },150);\n})();\n</script>`;
  html=html.replace('</body></html>',patch+'</body></html>');
  fs.writeFileSync(htmlPath,html,'utf8');
}

console.log('Enabled in-place application updates with persistent edit identity.');
