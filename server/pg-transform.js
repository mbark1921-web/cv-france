import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("server/index.js");
const targetPath = path.resolve("server/index.pg.generated.js");
let s = fs.readFileSync(sourcePath, "utf8");

s = s.replaceAll("db.prepare", "await db.prepare");
s = s.replace("const syncSubscription = (sub, userId = null) => {", "const syncSubscription = async (sub, userId = null) => {");
s = s.replaceAll("syncSubscription(sub, userId);", "await syncSubscription(sub, userId);");
s = s.replaceAll("syncSubscription(event.data.object);", "await syncSubscription(event.data.object);");
s = s.replace("function logEvent(userId, eventType, data = {}) {", "async function logEvent(userId, eventType, data = {}) {");
s = s.replace("function findValidInvite(code) {", "async function findValidInvite(code) {");
s = s.replace("function consumeAiQuota(userId) {", "async function consumeAiQuota(userId) {");
s = s.replace("matchedInvite = findValidInvite(input.inviteCode);", "matchedInvite = await findValidInvite(input.inviteCode);");
s = s.replaceAll("const quota = consumeAiQuota(req.user.id);", "const quota = await consumeAiQuota(req.user.id);");
s = s.replaceAll("(req, res) => {", "async (req, res) => {");
s = s.replaceAll("async async (req, res) => {", "async (req, res) => {");
s = s.replaceAll("db.transaction(() => {", "db.transaction(async () => {");
s = s.replaceAll("const tx = await db.transaction", "const tx = db.transaction");
s = s.replaceAll("\n      tx();", "\n      await tx();");
s = s.replaceAll("\n    tx();", "\n    await tx();");
s = s.replaceAll("\n  tx();", "\n  await tx();");
s = s.replaceAll("is_active=1", "is_active=true");
s = s.replaceAll("email_verified=1", "email_verified=true");
s = s.replaceAll("is_primary=0", "is_primary=false");
s = s.replaceAll("is_primary=1", "is_primary=true");
s = s.replaceAll("CASE WHEN is_active=true THEN 0 ELSE 1 END", "NOT is_active");
s = s.replaceAll("AND (expires_at IS NULL OR expires_at='' OR expires_at > CURRENT_TIMESTAMP)", "AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)");
s = s.replaceAll("existingCount === 0 ? 1 : 0", "Number(existingCount) === 0");

s = s.replace(
  'app.get("/api/readiness", async (req, res) => {\n  const checks = {',
  'app.get("/api/readiness", async (req, res) => {\n  let database = false;\n  try { database = await db.ping(); } catch {}\n\n  const checks = {\n    database,'
);
s = s.replace(
  '    "smtp",\n    "storage_writable"\n  ];',
  '    "smtp",\n    "database"\n  ];'
);
s = s.replace(
  '    "email",\n    "storage_writable"\n  ];',
  '    "email",\n    "database"\n  ];'
);

const adminStatus = s.indexOf('"/api/admin/status"');
if (adminStatus !== -1) {
  const start = s.indexOf("    const counts = {", adminStatus);
  const end = s.indexOf("\n\n    const services = {", start);
  if (start !== -1 && end !== -1) {
    const counts = `    const counts = {
      users: Number((await db.prepare("SELECT COUNT(*) AS n FROM users").get()).n),
      verified_users: Number((await db.prepare(
        "SELECT COUNT(*) AS n FROM users WHERE email_verified=true"
      ).get()).n),
      premium_users: Number((await db.prepare(
        "SELECT COUNT(*) AS n FROM users WHERE plan='premium'"
      ).get()).n),
      cvs: Number((await db.prepare("SELECT COUNT(*) AS n FROM cv_documents").get()).n),
      letters: Number((await db.prepare("SELECT COUNT(*) AS n FROM cover_letters").get()).n),
      applications: Number((await db.prepare("SELECT COUNT(*) AS n FROM applications").get()).n),
      feedback: Number((await db.prepare("SELECT COUNT(*) AS n FROM feedback").get()).n),
      active_invites: Number((await db.prepare(
        "SELECT COUNT(*) AS n FROM beta_invites WHERE is_active=true"
      ).get()).n),
      client_errors: Number((await db.prepare(
        "SELECT COUNT(*) AS n FROM client_errors"
      ).get()).n)
    };`;
    s = s.slice(0, start) + counts + s.slice(end);
  }
}

const backupStart = s.indexOf('app.post(\n  "/api/admin/backup"');
const backupEnd = s.indexOf("\n\n/* ---------- SUPPORT ---------- */", backupStart);
if (backupStart !== -1 && backupEnd !== -1) {
  const backupRoute = `app.post(
  "/api/admin/backup",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    res.status(409).json({
      error: "Utilisez les outils PostgreSQL CLI sécurisés (npm run backup) ou les sauvegardes du fournisseur.",
      managed_database: true
    });
  }
);`;
  s = s.slice(0, backupStart) + backupRoute + s.slice(backupEnd);
}

s = s.replace(
  `  httpServer.close(() => {
    try { db.close(); } catch {}
    console.log("HTTP server and database closed.");
    process.exit(0);
  });`,
  `  httpServer.close(async () => {
    try { await db.close(); } catch {}
    console.log("HTTP server and database closed.");
    process.exit(0);
  });`
);

const requiredMarkers = [
  "async function consumeAiQuota(userId)",
  "const quota = await consumeAiQuota(req.user.id)",
  "Number(existingCount) === 0",
  "database"
];
for (const marker of requiredMarkers) {
  if (!s.includes(marker)) {
    throw new Error(`PostgreSQL transform sanity check failed: ${marker}`);
  }
}

fs.writeFileSync(targetPath, s);
console.log(`Generated PostgreSQL server: ${targetPath}`);
