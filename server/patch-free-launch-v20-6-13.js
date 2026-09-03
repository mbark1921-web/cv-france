import fs from 'fs';
import path from 'path';

const file=path.resolve('server/index.js');
let src=fs.readFileSync(file,'utf8');
const marker='/* FREE_LAUNCH_V20_6_13 */';

if(src.includes(marker)){
  console.log('Free launch patch already applied.');
  process.exit(0);
}

src=src.replace('const stripe = process.env.STRIPE_SECRET_KEY\n  ? new Stripe(process.env.STRIPE_SECRET_KEY)\n  : null;', `${marker}\nconst FREE_LAUNCH_MODE = true;\nconst stripe = FREE_LAUNCH_MODE ? null : (process.env.STRIPE_SECRET_KEY\n  ? new Stripe(process.env.STRIPE_SECRET_KEY)\n  : null);`);

src=src.replace(/\n  const user = db\.prepare\("SELECT plan FROM users WHERE id=\?"\)\.get\(req\.user\.id\);\n  if \(user\?\.plan !== "premium"\) \{[\s\S]*?\n  \}\n\n  const existingCount = db\.prepare/, '\n  const existingCount = db.prepare');
src=src.replace(/\n  const user = db\.prepare\("SELECT plan FROM users WHERE id=\?"\)\.get\(req\.user\.id\);\n  if \(user\?\.plan !== "premium"\) \{[\s\S]*?\n  \}\n\n  const result = db\.prepare\(`\n    INSERT INTO cover_letters/, '\n  const result = db.prepare(`\n    INSERT INTO cover_letters');
src=src.replace(/\n  const user = db\.prepare\("SELECT plan FROM users WHERE id=\?"\)\.get\(req\.user\.id\);\n  if \(!user\) return res\.status\(404\)\.json\(\{ error: "Compte introuvable\." \}\);\n\n  if \(user\.plan !== "premium"\) \{[\s\S]*?\n  \}\n\n  const result = db\.prepare\(`\n    INSERT INTO applications/, '\n  const result = db.prepare(`\n    INSERT INTO applications');

src=src.replace('premium_display_price: process.env.PREMIUM_DISPLAY_PRICE || "Prix défini dans Stripe",\n    billing_enabled: Boolean(\n      process.env.STRIPE_SECRET_KEY &&\n      process.env.STRIPE_WEBHOOK_SECRET &&\n      process.env.STRIPE_PREMIUM_PRICE_ID\n    ),\n    ai_enabled: (process.env.AI_MODE || "mock") !== "disabled",', 'premium_display_price: null,\n    billing_enabled: false,\n    ai_enabled: false,');

src=src.replace('stripe_configured: Boolean(\n      process.env.STRIPE_SECRET_KEY &&\n      process.env.STRIPE_WEBHOOK_SECRET &&\n      process.env.STRIPE_PREMIUM_PRICE_ID\n    ),', 'stripe_configured: false,');
src=src.replace('ai_mode: process.env.AI_MODE || "mock",\n    openai_model: process.env.AI_MODE === "openai"\n      ? (process.env.OPENAI_MODEL || "gpt-5.6-luna")\n      : null', 'ai_mode: "disabled",\n    openai_model: null');

src=src.replace('app.get("/api/billing/status", requireAuth, requireVerified, (req, res) => {', 'app.get("/api/billing/status", requireAuth, requireVerified, (req, res) => {\n  if (FREE_LAUNCH_MODE) return res.json({ plan: "free", subscription_status: null, has_customer: false, has_subscription: false, billing_enabled: false });');
src=src.replace('app.post("/api/billing/create-checkout", requireAuth, requireVerified, async (req, res) => {', 'app.post("/api/billing/create-checkout", requireAuth, requireVerified, async (req, res) => {\n  if (FREE_LAUNCH_MODE) return res.status(503).json({ error: "CV France est gratuit pendant la phase de lancement." });');
src=src.replace('app.post("/api/billing/create-portal", requireAuth, requireVerified, async (req, res) => {', 'app.post("/api/billing/create-portal", requireAuth, requireVerified, async (req, res) => {\n  if (FREE_LAUNCH_MODE) return res.status(503).json({ error: "La facturation est désactivée pendant la phase de lancement." });');
src=src.replace('app.post("/api/billing/refresh-status", requireAuth, requireVerified, async (req, res) => {', 'app.post("/api/billing/refresh-status", requireAuth, requireVerified, async (req, res) => {\n  if (FREE_LAUNCH_MODE) return res.json({ plan: "free", subscription_status: null, session_invalidated: false, billing_enabled: false });');

src=src.replace('app.get("/api/ai/usage", requireAuth, requireVerified, requirePremium, (req, res) => {', 'app.get("/api/ai/usage", requireAuth, requireVerified, (req, res) => {\n  if (FREE_LAUNCH_MODE) return res.status(503).json({ error: "IA désactivée pendant la phase de lancement." });');
src=src.replace('  requirePremium,\n  async (req, res) => {\n    const input = parse(aiImproveSchema, req.body, res);', '  async (req, res) => {\n    if (FREE_LAUNCH_MODE) return res.status(503).json({ error: "IA désactivée pendant la phase de lancement." });\n    const input = parse(aiImproveSchema, req.body, res);');
src=src.replace('  requirePremium,\n  async (req, res) => {\n    const input = parse(aiLetterSchema, req.body, res);', '  async (req, res) => {\n    if (FREE_LAUNCH_MODE) return res.status(503).json({ error: "IA désactivée pendant la phase de lancement." });\n    const input = parse(aiLetterSchema, req.body, res);');

if(!src.includes(marker)) throw new Error('Free launch anchor not applied');
fs.writeFileSync(file,src,'utf8');
console.log('Applied free launch mode: no billing, no AI, no free-plan content caps.');
