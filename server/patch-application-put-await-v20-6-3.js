import fs from 'node:fs';

const file='server/index.js';
let s=fs.readFileSync(file,'utf8');
const marker='APPLICATION_PUT_AWAIT_V20_6_3';

if(!s.includes(marker)){
  const old=`/* APPLICATION_REAL_UPDATE_V20_6_0 */\napp.put("/api/applications/:id", requireAuth, requireVerified, (req, res) => {\n  const input = parse(applicationSchema, req.body, res);\n  if (!input) return;\n\n  const id = Number(req.params.id);\n  if (!Number.isInteger(id) || id <= 0) {\n    return res.status(400).json({ error: "Identifiant invalide." });\n  }\n\n  const result = db.prepare(\`\n    UPDATE applications\n    SET company=?, role=?, status=?, applied_date=?, notes=?\n    WHERE id=? AND user_id=?\n  \`).run(\n    input.company,\n    input.role,\n    input.status,\n    input.applied_date || null,\n    input.notes || '',\n    id,\n    req.user.id\n  );\n\n  if (!result.changes) return res.status(404).json({ error: "Introuvable." });\n  res.json({ ok: true, id });\n});`;

  const replacement=`/* APPLICATION_REAL_UPDATE_V20_6_0 */\n/* ${marker} */\napp.put("/api/applications/:id", requireAuth, requireVerified, async (req, res) => {\n  const input = parse(applicationSchema, req.body, res);\n  if (!input) return;\n\n  const id = Number(req.params.id);\n  if (!Number.isInteger(id) || id <= 0) {\n    return res.status(400).json({ error: "Identifiant invalide." });\n  }\n\n  const result = await db.prepare(\`\n    UPDATE applications\n    SET company=?, role=?, status=?, applied_date=?, notes=?\n    WHERE id=? AND user_id=?\n  \`).run(\n    input.company,\n    input.role,\n    input.status,\n    input.applied_date || null,\n    input.notes || '',\n    id,\n    req.user.id\n  );\n\n  if (!result.changes) return res.status(404).json({ error: "Introuvable." });\n  res.json({ ok: true, id });\n});`;

  if(!s.includes(old))throw new Error('Application PUT route shape not found');
  s=s.replace(old,replacement);
  fs.writeFileSync(file,s,'utf8');
}

if(!s.includes(marker))throw new Error('Application PUT await patch failed');
console.log('Awaited PostgreSQL candidature updates before responding.');
