import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import path from "path";
import fs from "fs";
import db from "./db.js";
import { requireAuth, requireVerified, requirePremium, requireAdmin } from "./auth.js";
import {
  registerSchema, loginSchema, passwordChangeSchema,
  resetRequestSchema, resetConfirmSchema, verifyEmailSchema,
  applicationSchema, profileSchema, aiImproveSchema,
  cvDocumentSchema, coverLetterSchema, aiLetterSchema, contactSchema, feedbackSchema,
  inviteCreateSchema, feedbackAdminSchema, clientErrorSchema
} from "./validation.js";
import { createRawToken, hashToken, futureIso } from "./tokens.js";
import { sendMail } from "./mailer.js";
import { improveProfile, generateCoverLetter } from "./ai.js";

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn("WARNING: JWT_SECRET should be at least 32 characters.");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",").map(x => x.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed"));
  }
}));

/* Stripe requires the raw request body to verify the webhook signature. */
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).send("Stripe webhook not configured");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Stripe webhook verification failed:", err.message);
      return res.status(400).send("Invalid webhook signature");
    }

    try {
      const syncSubscription = (sub, userId = null) => {
        const status = String(sub.status || "");
        const premiumStatuses = new Set(["active", "trialing"]);
        const plan = premiumStatuses.has(status) ? "premium" : "free";
        const subscriptionId = String(sub.id || "");
        const customerId = String(sub.customer || "");

        if (Number.isInteger(userId)) {
          db.prepare(`
            UPDATE users
            SET plan=?,
                stripe_customer_id=?,
                stripe_subscription_id=?,
                subscription_status=?,
                token_version=token_version+1
            WHERE id=?
          `).run(plan, customerId, subscriptionId, status, userId);
          return;
        }

        db.prepare(`
          UPDATE users
          SET plan=?,
              stripe_customer_id=COALESCE(NULLIF(?, ''), stripe_customer_id),
              subscription_status=?,
              token_version=token_version+1
          WHERE stripe_subscription_id=?
        `).run(plan, customerId, status, subscriptionId);
      };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = Number(session.client_reference_id);

        if (
          Number.isInteger(userId) &&
          session.subscription &&
          stripe
        ) {
          const sub = await stripe.subscriptions.retrieve(
            String(session.subscription)
          );
          syncSubscription(sub, userId);
          logEvent(userId, "billing.checkout_completed", {
            subscription_id: String(session.subscription || "")
          });
        }
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        syncSubscription(event.data.object);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook handling error:", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const maintenance = (process.env.MAINTENANCE_MODE || "off") === "on";
  const exempt =
    req.path === "/api/health" ||
    req.path === "/api/readiness" ||
    req.path.startsWith("/api/admin/");

  if (maintenance && req.path.startsWith("/api/") && !exempt) {
    return res.status(503).json({
      error: "CV France est temporairement en maintenance."
    });
  }

  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/support/", supportLimiter);
app.use(express.static(path.resolve("public")));

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan,
      tv: user.token_version
    },
    process.env.JWT_SECRET || "development-secret-development-secret",
    { expiresIn: "7d" }
  );
}

function parse(schema, body, res) {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: "Données invalides.",
      details: result.error.flatten()
    });
    return null;
  }
  return result.data;
}

function storageWritable() {
  const dir = path.resolve(process.env.DATA_DIR || "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `.readiness-${process.pid}`);
    fs.writeFileSync(file, "ok");
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

function logEvent(userId, eventType, data = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log(user_id,event_type,event_data)
      VALUES(?,?,?)
    `).run(
      userId || null,
      String(eventType),
      JSON.stringify(data || {})
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

function registrationMode() {
  return String(process.env.REGISTRATION_MODE || "open").toLowerCase();
}

function inviteCodes() {
  return new Set(
    String(process.env.BETA_INVITE_CODES || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
  );
}

function findValidInvite(code) {
  const clean = String(code || "").trim();
  if (!clean) return null;

  const row = db.prepare(`
    SELECT *
    FROM beta_invites
    WHERE code=?
      AND is_active=1
      AND used_count < max_uses
      AND (expires_at IS NULL OR expires_at='' OR expires_at > CURRENT_TIMESTAMP)
  `).get(clean);

  if (row) return { type: "db", row };

  if (inviteCodes().has(clean)) {
    return { type: "env", row: null };
  }

  return null;
}

/* ---------- HEALTH ---------- */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    version: "20.0.0",
    stripe_configured: Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PREMIUM_PRICE_ID
    ),
    email_mode: process.env.EMAIL_MODE || "console",
    ai_mode: process.env.AI_MODE || "mock",
    openai_model: process.env.AI_MODE === "openai"
      ? (process.env.OPENAI_MODEL || "gpt-5.6-luna")
      : null
  });
});

app.get("/api/readiness", (req, res) => {
  const checks = {
    domain: Boolean(
      process.env.DOMAIN &&
      !String(process.env.DOMAIN).includes("example.com")
    ),
    https_base_url: Boolean(
      process.env.PUBLIC_BASE_URL &&
      String(process.env.PUBLIC_BASE_URL).startsWith("https://") &&
      !String(process.env.PUBLIC_BASE_URL).includes("example.com")
    ),
    jwt_secret: Boolean(
      process.env.JWT_SECRET &&
      String(process.env.JWT_SECRET).length >= 32
    ),
    support_email: Boolean(
      process.env.SUPPORT_EMAIL &&
      !String(process.env.SUPPORT_EMAIL).includes("example.com")
    ),
    admin_email: Boolean(
      process.env.ADMIN_EMAIL &&
      !String(process.env.ADMIN_EMAIL).includes("example.com")
    ),
    smtp: (process.env.EMAIL_MODE || "console") === "smtp"
      ? Boolean(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        )
      : false,
    stripe: Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PREMIUM_PRICE_ID
    ),
    ai: (process.env.AI_MODE || "mock") === "openai"
      ? Boolean(process.env.OPENAI_API_KEY)
      : (process.env.AI_MODE || "mock") !== "mock",
    storage_writable: storageWritable()
  };

  const requiredForPublic = [
    "domain",
    "https_base_url",
    "jwt_secret",
    "support_email",
    "admin_email",
    "smtp",
    "storage_writable"
  ];

  const publicReady = requiredForPublic.every(k => checks[k]);

  res.status(publicReady ? 200 : 503).json({
    ok: publicReady,
    stage: process.env.APP_STAGE || "staging",
    maintenance: (process.env.MAINTENANCE_MODE || "off") === "on",
    registration_mode: registrationMode(),
    feedback_enabled: String(process.env.FEEDBACK_ENABLED || "true") === "true",
    checks
  });
});

app.get("/api/public/config", (req, res) => {
  res.json({
    premium_display_price: process.env.PREMIUM_DISPLAY_PRICE || "Prix défini dans Stripe",
    billing_enabled: Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PREMIUM_PRICE_ID
    ),
    ai_enabled: (process.env.AI_MODE || "mock") !== "disabled",
    support_email: process.env.SUPPORT_EMAIL || "",
    analytics_enabled: (process.env.ANALYTICS_MODE || "off") === "on",
    registration_mode: registrationMode(),
    feedback_enabled: String(process.env.FEEDBACK_ENABLED || "true") === "true"
  });
});

/* ---------- AUTH ---------- */

async function issueVerificationEmail(user) {
  const raw = createRawToken();
  const hash = hashToken(raw);
  const expiresAt = futureIso(60 * 60 * 1000);

  db.prepare("DELETE FROM email_verification_tokens WHERE user_id=?").run(user.id);
  db.prepare(`
    INSERT INTO email_verification_tokens(user_id,token_hash,expires_at)
    VALUES(?,?,?)
  `).run(user.id, hash, expiresAt);

  const link = `${PUBLIC_BASE_URL}/?verify=${encodeURIComponent(raw)}`;

  await sendMail({
    to: user.email,
    subject: "Confirmez votre adresse e-mail — CV France",
    text: `Bonjour,\n\nConfirmez votre adresse e-mail :\n${link}\n\nCe lien expire dans 60 minutes.`
  });
}

app.post("/api/auth/register", async (req, res) => {
  const input = parse(registerSchema, req.body, res);
  if (!input) return;

  const mode = registrationMode();

  if (mode === "closed") {
    return res.status(403).json({
      error: "Les inscriptions sont temporairement fermées."
    });
  }

  let matchedInvite = null;

  if (mode === "invite") {
    matchedInvite = findValidInvite(input.inviteCode);

    if (!matchedInvite) {
      return res.status(403).json({
        error: "Code d'invitation invalide, expiré ou déjà utilisé."
      });
    }
  }

  try {
    const email = input.email.toLowerCase().trim();
    const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (existing) {
      return res.status(409).json({ error: "Adresse e-mail déjà utilisée." });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = db.prepare(
      "INSERT INTO users(email,password_hash) VALUES(?,?)"
    ).run(email, passwordHash);

    const user = db.prepare(`
      SELECT id,email,plan,token_version,email_verified,subscription_status
      FROM users WHERE id=?
    `).get(result.lastInsertRowid);

    db.prepare(
      "INSERT OR IGNORE INTO profiles(user_id,data_json) VALUES(?,?)"
    ).run(user.id, "{}");

    if (matchedInvite?.type === "db" && matchedInvite.row?.id) {
      const tx = db.transaction(() => {
        db.prepare(`
          UPDATE beta_invites
          SET used_count=used_count+1
          WHERE id=? AND used_count < max_uses
        `).run(matchedInvite.row.id);

        db.prepare(`
          INSERT INTO beta_invite_uses(invite_id,user_id)
          VALUES(?,?)
        `).run(matchedInvite.row.id, user.id);
      });
      tx();
    }

    await issueVerificationEmail(user);
    logEvent(user.id, "user.registered", {
      registration_mode: mode,
      invite_source: matchedInvite?.type || null
    });

    res.json({
      token: signUser(user),
      user,
      message: "Compte créé. Vérifiez votre adresse e-mail."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer le compte." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const input = parse(loginSchema, req.body, res);
  if (!input) return;

  const row = db.prepare("SELECT * FROM users WHERE email=?")
    .get(input.email.toLowerCase().trim());

  if (!row || !(await bcrypt.compare(input.password, row.password_hash))) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  logEvent(row.id, "user.logged_in");

  res.json({
    token: signUser(row),
    user: {
      id: row.id,
      email: row.email,
      plan: row.plan,
      email_verified: Boolean(row.email_verified),
      subscription_status: row.subscription_status
    }
  });
});

app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.email_verified) return res.json({ message: "Adresse déjà confirmée." });

  await issueVerificationEmail(user);
  res.json({ message: "Nouvel e-mail de confirmation envoyé." });
});

app.post("/api/auth/verify-email", (req, res) => {
  const input = parse(verifyEmailSchema, req.body, res);
  if (!input) return;

  const hash = hashToken(input.token);
  const row = db.prepare(`
    SELECT * FROM email_verification_tokens
    WHERE token_hash=? AND used_at IS NULL AND expires_at > ?
  `).get(hash, new Date().toISOString());

  if (!row) return res.status(400).json({ error: "Lien invalide ou expiré." });

  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET email_verified=1 WHERE id=?").run(row.user_id);
    db.prepare("UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(row.id);
  });
  tx();

  res.json({ message: "Adresse e-mail confirmée." });
});

app.post("/api/auth/request-password-reset", async (req, res) => {
  const input = parse(resetRequestSchema, req.body, res);
  if (!input) return;

  const generic = "Si ce compte existe, un lien de réinitialisation a été envoyé.";
  const user = db.prepare("SELECT * FROM users WHERE email=?")
    .get(input.email.toLowerCase().trim());

  if (!user) return res.json({ message: generic });

  const raw = createRawToken();
  const hash = hashToken(raw);
  const expiresAt = futureIso(30 * 60 * 1000);

  db.prepare("DELETE FROM password_reset_tokens WHERE user_id=?").run(user.id);
  db.prepare(`
    INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
    VALUES(?,?,?)
  `).run(user.id, hash, expiresAt);

  const link = `${PUBLIC_BASE_URL}/?reset=${encodeURIComponent(raw)}`;

  await sendMail({
    to: user.email,
    subject: "Réinitialisation du mot de passe — CV France",
    text: `Bonjour,\n\nRéinitialisez votre mot de passe :\n${link}\n\nCe lien expire dans 30 minutes.`
  });

  res.json({ message: generic });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const input = parse(resetConfirmSchema, req.body, res);
  if (!input) return;

  const hash = hashToken(input.token);
  const row = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token_hash=? AND used_at IS NULL AND expires_at > ?
  `).get(hash, new Date().toISOString());

  if (!row) return res.status(400).json({ error: "Lien invalide ou expiré." });

  const newHash = await bcrypt.hash(input.newPassword, 12);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET password_hash=?, token_version=token_version+1
      WHERE id=?
    `).run(newHash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(row.id);
  });
  tx();

  res.json({ message: "Mot de passe modifié. Reconnectez-vous." });
});

app.get("/api/me", requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT id,email,plan,email_verified,subscription_status
    FROM users WHERE id=?
  `).get(req.user.id);

  res.json({
    user: {
      ...row,
      email_verified: Boolean(row.email_verified)
    }
  });
});

/* ---------- CLIENT DIAGNOSTICS ---------- */

app.post("/api/client-error", (req, res) => {
  if (String(process.env.CLIENT_ERROR_REPORTING || "on") !== "on") {
    return res.status(204).end();
  }

  const input = parse(clientErrorSchema, req.body, res);
  if (!input) return;

  let userId = null;
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      userId = Number(payload.id) || null;
    } catch {}
  }

  db.prepare(`
    INSERT INTO client_errors(
      user_id,message,source,line,column_no,stack,page,user_agent
    ) VALUES(?,?,?,?,?,?,?,?)
  `).run(
    userId,
    input.message,
    input.source,
    input.line ?? null,
    input.column ?? null,
    input.stack,
    input.page,
    input.userAgent
  );

  res.json({ ok: true });
});

/* ---------- BETA FEEDBACK ---------- */

app.post(
  "/api/feedback",
  requireAuth,
  requireVerified,
  (req, res) => {
    if (String(process.env.FEEDBACK_ENABLED || "true") !== "true") {
      return res.status(503).json({ error: "Feedback temporairement désactivé." });
    }

    const input = parse(feedbackSchema, req.body, res);
    if (!input) return;

    const result = db.prepare(`
      INSERT INTO feedback(user_id,rating,category,message,page)
      VALUES(?,?,?,?,?)
    `).run(
      req.user.id,
      input.rating || null,
      input.category,
      input.message,
      input.page
    );

    logEvent(req.user.id, "feedback.created", {
      feedback_id: Number(result.lastInsertRowid),
      category: input.category,
      rating: input.rating || null
    });

    res.json({
      ok: true,
      id: result.lastInsertRowid,
      message: "Merci pour votre retour."
    });
  }
);

/* ---------- ADMIN / PILOT ---------- */

app.get(
  "/api/admin/status",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const counts = {
      users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      verified_users: db.prepare(
        "SELECT COUNT(*) AS n FROM users WHERE email_verified=1"
      ).get().n,
      premium_users: db.prepare(
        "SELECT COUNT(*) AS n FROM users WHERE plan='premium'"
      ).get().n,
      cvs: db.prepare("SELECT COUNT(*) AS n FROM cv_documents").get().n,
      letters: db.prepare("SELECT COUNT(*) AS n FROM cover_letters").get().n,
      applications: db.prepare("SELECT COUNT(*) AS n FROM applications").get().n,
      feedback: db.prepare("SELECT COUNT(*) AS n FROM feedback").get().n,
      active_invites: db.prepare(
        "SELECT COUNT(*) AS n FROM beta_invites WHERE is_active=1"
      ).get().n,
      client_errors: db.prepare(
        "SELECT COUNT(*) AS n FROM client_errors"
      ).get().n
    };

    const services = {
      email_mode: process.env.EMAIL_MODE || "console",
      smtp_configured: Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD
      ),
      stripe_configured: Boolean(
        process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_WEBHOOK_SECRET &&
        process.env.STRIPE_PREMIUM_PRICE_ID
      ),
      ai_mode: process.env.AI_MODE || "mock",
      ai_configured:
        (process.env.AI_MODE || "mock") === "openai"
          ? Boolean(process.env.OPENAI_API_KEY)
          : (process.env.AI_MODE || "mock") !== "mock",
      support_email: process.env.SUPPORT_EMAIL || "",
      stage: process.env.APP_STAGE || "staging",
      maintenance: (process.env.MAINTENANCE_MODE || "off") === "on"
    };

    res.json({ counts, services });
  }
);

app.get(
  "/api/admin/feedback",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        f.id,
        f.rating,
        f.category,
        f.message,
        f.page,
        f.status,
        f.admin_note,
        f.updated_at,
        f.created_at,
        u.email
      FROM feedback f
      LEFT JOIN users u ON u.id=f.user_id
      ORDER BY f.id DESC
      LIMIT 100
    `).all();

    res.json({ feedback: rows });
  }
);

app.get(
  "/api/admin/audit",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        a.id,
        a.event_type,
        a.event_data,
        a.created_at,
        u.email
      FROM audit_log a
      LEFT JOIN users u ON u.id=a.user_id
      ORDER BY a.id DESC
      LIMIT 100
    `).all();

    res.json({
      events: rows.map(row => ({
        ...row,
        event_data: (() => {
          try { return JSON.parse(row.event_data || "{}"); }
          catch { return {}; }
        })()
      }))
    });
  }
);

app.get(
  "/api/admin/invites",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        i.id,i.code,i.label,i.max_uses,i.used_count,i.is_active,
        i.expires_at,i.created_at,
        u.email AS created_by_email
      FROM beta_invites i
      LEFT JOIN users u ON u.id=i.created_by
      ORDER BY i.id DESC
      LIMIT 200
    `).all();

    res.json({ invites: rows });
  }
);

app.post(
  "/api/admin/invites",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const input = parse(inviteCreateSchema, req.body, res);
    if (!input) return;

    try {
      const result = db.prepare(`
        INSERT INTO beta_invites(
          code,label,max_uses,expires_at,created_by
        ) VALUES(?,?,?,?,?)
      `).run(
        input.code,
        input.label,
        input.maxUses,
        input.expiresAt || null,
        req.user.id
      );

      logEvent(req.user.id, "invite.created", {
        invite_id: Number(result.lastInsertRowid),
        code: input.code,
        max_uses: input.maxUses
      });

      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) {
        return res.status(409).json({ error: "Ce code existe déjà." });
      }
      throw err;
    }
  }
);

app.post(
  "/api/admin/invites/:id/toggle",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    db.prepare(`
      UPDATE beta_invites
      SET is_active=CASE WHEN is_active=1 THEN 0 ELSE 1 END
      WHERE id=?
    `).run(id);

    res.json({ ok: true });
  }
);

app.get(
  "/api/admin/invite-uses",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        bu.id,
        bi.code,
        bi.label,
        u.email,
        bu.used_at
      FROM beta_invite_uses bu
      JOIN beta_invites bi ON bi.id=bu.invite_id
      JOIN users u ON u.id=bu.user_id
      ORDER BY bu.id DESC
      LIMIT 200
    `).all();

    res.json({ uses: rows });
  }
);

app.put(
  "/api/admin/feedback/:id",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalide." });
    }

    const input = parse(feedbackAdminSchema, req.body, res);
    if (!input) return;

    const result = db.prepare(`
      UPDATE feedback
      SET status=?,admin_note=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(input.status, input.adminNote, id);

    if (!result.changes) {
      return res.status(404).json({ error: "Feedback introuvable." });
    }

    logEvent(req.user.id, "feedback.updated", {
      feedback_id: id,
      status: input.status
    });

    res.json({ ok: true });
  }
);

app.get(
  "/api/admin/client-errors",
  requireAuth,
  requireAdmin,
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        ce.id,ce.message,ce.source,ce.line,ce.column_no,
        ce.stack,ce.page,ce.user_agent,ce.created_at,
        u.email
      FROM client_errors ce
      LEFT JOIN users u ON u.id=ce.user_id
      ORDER BY ce.id DESC
      LIMIT 100
    `).all();

    res.json({ errors: rows });
  }
);

app.post(
  "/api/admin/test-email",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const to = process.env.ADMIN_EMAIL;
    if (!to) {
      return res.status(503).json({ error: "ADMIN_EMAIL non configuré." });
    }

    await sendMail({
      to,
      subject: "Test e-mail — CV France",
      text:
        "Ceci est un e-mail de test envoyé depuis le panneau administrateur de CV France."
    });

    res.json({ ok: true, message: "E-mail de test envoyé." });
  }
);

app.post(
  "/api/admin/backup",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const fsModule = await import("fs");
    const backupPath = await import("path");

    const dir = backupPath.resolve(process.env.BACKUP_DIR || "backups");
    fsModule.default.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = backupPath.join(
      dir,
      `cv-france-admin-${stamp}.db`
    );

    await db.backup(target);

    res.json({
      ok: true,
      message: "Sauvegarde créée sur le serveur.",
      filename: backupPath.basename(target)
    });
  }
);

/* ---------- SUPPORT ---------- */

app.post("/api/support/contact", async (req, res) => {
  const input = parse(contactSchema, req.body, res);
  if (!input) return;

  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    return res.status(503).json({
      error: "Le support n'est pas encore configuré."
    });
  }

  try {
    await sendMail({
      to: supportEmail,
      subject: `[CV France] ${input.subject}`,
      text:
        `Nom: ${input.name}\n` +
        `E-mail: ${input.email}\n\n` +
        `${input.message}`
    });

    res.json({
      ok: true,
      message: "Votre message a été envoyé au support."
    });
  } catch (err) {
    console.error("Support email error:", err);
    res.status(502).json({
      error: "Impossible d'envoyer le message pour le moment."
    });
  }
});

/* ---------- CV DOCUMENTS ---------- */

app.get("/api/cvs", requireAuth, requireVerified, (req, res) => {
  const rows = db.prepare(`
    SELECT id,title,target_role,data_json,is_primary,created_at,updated_at
    FROM cv_documents
    WHERE user_id=?
    ORDER BY is_primary DESC, updated_at DESC, id DESC
  `).all(req.user.id);

  res.json({
    cvs: rows.map(row => ({
      ...row,
      is_primary: Boolean(row.is_primary),
      data: (() => {
        try { return JSON.parse(row.data_json || "{}"); }
        catch { return {}; }
      })()
    }))
  });
});

app.get("/api/cvs/:id", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT id,title,target_role,data_json,is_primary,created_at,updated_at
    FROM cv_documents
    WHERE id=? AND user_id=?
  `).get(id, req.user.id);

  if (!row) return res.status(404).json({ error: "CV introuvable." });

  res.json({
    cv: {
      ...row,
      is_primary: Boolean(row.is_primary),
      data: (() => {
        try { return JSON.parse(row.data_json || "{}"); }
        catch { return {}; }
      })()
    }
  });
});

app.post("/api/cvs", requireAuth, requireVerified, (req, res) => {
  const input = parse(cvDocumentSchema, req.body, res);
  if (!input) return;

  const user = db.prepare("SELECT plan FROM users WHERE id=?").get(req.user.id);
  if (user?.plan !== "premium") {
    const count = db.prepare(
      "SELECT COUNT(*) AS n FROM cv_documents WHERE user_id=?"
    ).get(req.user.id).n;
    if (count >= 2) {
      return res.status(403).json({
        error: "Plan Gratuit: maximum 2 CV enregistrés."
      });
    }
  }

  const existingCount = db.prepare(
    "SELECT COUNT(*) AS n FROM cv_documents WHERE user_id=?"
  ).get(req.user.id).n;

  const result = db.prepare(`
    INSERT INTO cv_documents(
      user_id,title,target_role,data_json,is_primary,updated_at
    ) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
  `).run(
    req.user.id,
    input.title,
    input.targetRole,
    JSON.stringify(input.data),
    existingCount === 0 ? 1 : 0
  );

  res.json({ id: result.lastInsertRowid });
});

app.put("/api/cvs/:id", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);
  const input = parse(cvDocumentSchema, req.body, res);
  if (!input) return;

  const result = db.prepare(`
    UPDATE cv_documents
    SET title=?,target_role=?,data_json=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND user_id=?
  `).run(
    input.title,
    input.targetRole,
    JSON.stringify(input.data),
    id,
    req.user.id
  );

  if (!result.changes) return res.status(404).json({ error: "CV introuvable." });
  res.json({ ok: true });
});

app.post("/api/cvs/:id/primary", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);

  const row = db.prepare(
    "SELECT id FROM cv_documents WHERE id=? AND user_id=?"
  ).get(id, req.user.id);
  if (!row) return res.status(404).json({ error: "CV introuvable." });

  const tx = db.transaction(() => {
    db.prepare("UPDATE cv_documents SET is_primary=0 WHERE user_id=?")
      .run(req.user.id);
    db.prepare(`
      UPDATE cv_documents
      SET is_primary=1,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=?
    `).run(id, req.user.id);
  });
  tx();

  res.json({ ok: true });
});

app.delete("/api/cvs/:id", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT id,is_primary FROM cv_documents
    WHERE id=? AND user_id=?
  `).get(id, req.user.id);

  if (!row) return res.status(404).json({ error: "CV introuvable." });

  db.prepare("DELETE FROM cv_documents WHERE id=? AND user_id=?")
    .run(id, req.user.id);

  if (row.is_primary) {
    const next = db.prepare(`
      SELECT id FROM cv_documents
      WHERE user_id=?
      ORDER BY updated_at DESC,id DESC
      LIMIT 1
    `).get(req.user.id);
    if (next) {
      db.prepare("UPDATE cv_documents SET is_primary=1 WHERE id=?")
        .run(next.id);
    }
  }

  res.json({ ok: true });
});

/* ---------- COVER LETTERS ---------- */

app.get("/api/letters", requireAuth, requireVerified, (req, res) => {
  const rows = db.prepare(`
    SELECT id,title,company,target_role,content,created_at,updated_at
    FROM cover_letters
    WHERE user_id=?
    ORDER BY updated_at DESC,id DESC
  `).all(req.user.id);

  res.json({ letters: rows });
});

app.post("/api/letters", requireAuth, requireVerified, (req, res) => {
  const input = parse(coverLetterSchema, req.body, res);
  if (!input) return;

  const user = db.prepare("SELECT plan FROM users WHERE id=?").get(req.user.id);
  if (user?.plan !== "premium") {
    const count = db.prepare(
      "SELECT COUNT(*) AS n FROM cover_letters WHERE user_id=?"
    ).get(req.user.id).n;
    if (count >= 3) {
      return res.status(403).json({
        error: "Plan Gratuit: maximum 3 lettres enregistrées."
      });
    }
  }

  const result = db.prepare(`
    INSERT INTO cover_letters(
      user_id,title,company,target_role,content,updated_at
    ) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
  `).run(
    req.user.id,
    input.title,
    input.company,
    input.targetRole,
    input.content
  );

  res.json({ id: result.lastInsertRowid });
});

app.put("/api/letters/:id", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);
  const input = parse(coverLetterSchema, req.body, res);
  if (!input) return;

  const result = db.prepare(`
    UPDATE cover_letters
    SET title=?,company=?,target_role=?,content=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND user_id=?
  `).run(
    input.title,
    input.company,
    input.targetRole,
    input.content,
    id,
    req.user.id
  );

  if (!result.changes) return res.status(404).json({ error: "Lettre introuvable." });
  res.json({ ok: true });
});

app.delete("/api/letters/:id", requireAuth, requireVerified, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare(
    "DELETE FROM cover_letters WHERE id=? AND user_id=?"
  ).run(id, req.user.id);

  if (!result.changes) return res.status(404).json({ error: "Lettre introuvable." });
  res.json({ ok: true });
});

/* ---------- LEGACY PROFILE ---------- */

app.get("/api/profile", requireAuth, requireVerified, (req, res) => {
  const row = db.prepare("SELECT data_json FROM profiles WHERE user_id=?").get(req.user.id);
  res.json({ profile: row ? JSON.parse(row.data_json) : {} });
});

app.put("/api/profile", requireAuth, requireVerified, (req, res) => {
  const input = parse(profileSchema, req.body, res);
  if (!input) return;

  db.prepare(`
    INSERT INTO profiles(user_id,data_json,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      data_json=excluded.data_json,
      updated_at=CURRENT_TIMESTAMP
  `).run(req.user.id, JSON.stringify(input));

  res.json({ ok: true });
});

/* ---------- APPLICATIONS ---------- */

app.get("/api/applications", requireAuth, requireVerified, (req, res) => {
  const rows = db.prepare(`
    SELECT id,company,role,status,applied_date,notes,created_at
    FROM applications WHERE user_id=? ORDER BY id DESC
  `).all(req.user.id);
  res.json({ applications: rows });
});

app.post("/api/applications", requireAuth, requireVerified, (req, res) => {
  const input = parse(applicationSchema, req.body, res);
  if (!input) return;

  const user = db.prepare("SELECT plan FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Compte introuvable." });

  if (user.plan !== "premium") {
    const count = db.prepare(
      "SELECT COUNT(*) AS n FROM applications WHERE user_id=?"
    ).get(req.user.id).n;

    if (count >= 10) {
      return res.status(403).json({
        error: "Plan Gratuit: maximum 10 candidatures."
      });
    }
  }

  const result = db.prepare(`
    INSERT INTO applications(user_id,company,role,status,applied_date,notes)
    VALUES(?,?,?,?,?,?)
  `).run(
    req.user.id,
    input.company,
    input.role,
    input.status,
    input.applied_date,
    input.notes
  );

  res.json({ id: result.lastInsertRowid });
});

app.delete("/api/applications/:id", requireAuth, requireVerified, (req, res) => {
  const result = db.prepare(
    "DELETE FROM applications WHERE id=? AND user_id=?"
  ).run(Number(req.params.id), req.user.id);

  if (!result.changes) return res.status(404).json({ error: "Introuvable." });
  res.json({ ok: true });
});

/* ---------- BILLING ---------- */

app.get("/api/billing/status", requireAuth, requireVerified, (req, res) => {
  const user = db.prepare(`
    SELECT plan,stripe_customer_id,stripe_subscription_id,subscription_status
    FROM users WHERE id=?
  `).get(req.user.id);

  res.json({
    plan: user?.plan || "free",
    subscription_status: user?.subscription_status || null,
    has_customer: Boolean(user?.stripe_customer_id),
    has_subscription: Boolean(user?.stripe_subscription_id)
  });
});

app.post("/api/billing/create-checkout", requireAuth, requireVerified, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PREMIUM_PRICE_ID) {
    return res.status(503).json({ error: "Paiement Stripe non configuré." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.plan === "premium") {
    return res.status(400).json({ error: "Votre compte est déjà Premium." });
  }

  const sessionData = {
    mode: "subscription",
    client_reference_id: String(user.id),
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${PUBLIC_BASE_URL}/?billing=success`,
    cancel_url: `${PUBLIC_BASE_URL}/?billing=cancel`,
    metadata: { user_id: String(user.id) },
    subscription_data: { metadata: { user_id: String(user.id) } }
  };

  if (user.stripe_customer_id) sessionData.customer = user.stripe_customer_id;
  else sessionData.customer_email = user.email;

  const session = await stripe.checkout.sessions.create(sessionData);
  res.json({ url: session.url });
});

app.post("/api/billing/create-portal", requireAuth, requireVerified, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe non configuré." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: "Aucun compte de facturation Stripe trouvé." });
  }

  const params = {
    customer: user.stripe_customer_id,
    return_url: `${PUBLIC_BASE_URL}/?billing=portal_return`
  };

  if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
    params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  }

  const portal = await stripe.billingPortal.sessions.create(params);
  res.json({ url: portal.url });
});

app.post("/api/billing/refresh-status", requireAuth, requireVerified, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe non configuré." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Compte introuvable." });

  let sub = null;

  if (user.stripe_subscription_id) {
    try {
      sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    } catch (err) {
      console.error("Subscription refresh by id failed:", err.message);
    }
  }

  if (!sub && user.stripe_customer_id) {
    const list = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: "all",
      limit: 10
    });

    sub = list.data.sort((a, b) => b.created - a.created)[0] || null;
  }

  if (!sub) {
    const oldPlan = user.plan;
    db.prepare(`
      UPDATE users
      SET plan='free',
          stripe_subscription_id=NULL,
          subscription_status=NULL,
          token_version=token_version+1
      WHERE id=?
    `).run(user.id);

    return res.json({
      plan: "free",
      subscription_status: null,
      session_invalidated: oldPlan !== "free"
    });
  }

  const premium = new Set(["active", "trialing"]).has(String(sub.status || ""));
  const nextPlan = premium ? "premium" : "free";
  const changed = nextPlan !== user.plan;

  db.prepare(`
    UPDATE users
    SET plan=?,
        stripe_customer_id=?,
        stripe_subscription_id=?,
        subscription_status=?,
        token_version=token_version+?
    WHERE id=?
  `).run(
    nextPlan,
    String(sub.customer || user.stripe_customer_id || ""),
    String(sub.id),
    String(sub.status || ""),
    changed ? 1 : 0,
    user.id
  );

  res.json({
    plan: nextPlan,
    subscription_status: sub.status,
    session_invalidated: changed
  });
});

/* ---------- AI ---------- */

function consumeAiQuota(userId) {
  const limit = Math.max(1, Number(process.env.AI_DAILY_LIMIT || 100));
  const day = new Date().toISOString().slice(0, 10);

  const current = db.prepare(`
    SELECT request_count FROM ai_usage WHERE user_id=? AND usage_date=?
  `).get(userId, day);

  const used = current?.request_count || 0;
  if (used >= limit) return { ok: false, used, limit };

  db.prepare(`
    INSERT INTO ai_usage(user_id,usage_date,request_count)
    VALUES(?,?,1)
    ON CONFLICT(user_id,usage_date) DO UPDATE SET
      request_count=request_count+1
  `).run(userId, day);

  return { ok: true, used: used + 1, limit };
}

app.get("/api/ai/usage", requireAuth, requireVerified, requirePremium, (req, res) => {
  const limit = Math.max(1, Number(process.env.AI_DAILY_LIMIT || 100));
  const day = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`
    SELECT request_count FROM ai_usage WHERE user_id=? AND usage_date=?
  `).get(req.user.id, day);

  res.json({
    used_today: row?.request_count || 0,
    daily_limit: limit,
    usage_date: day
  });
});

app.post(
  "/api/ai/improve-profile",
  requireAuth,
  requireVerified,
  requirePremium,
  async (req, res) => {
    const input = parse(aiImproveSchema, req.body, res);
    if (!input) return;

    const quota = consumeAiQuota(req.user.id);
    if (!quota.ok) {
      return res.status(429).json({
        error: `Limite IA atteinte (${quota.limit}/jour).`
      });
    }

    try {
      const text = await improveProfile(input.text, input.targetRole);
      res.json({
        text,
        mode: process.env.AI_MODE || "mock",
        usage: {
          used_today: quota.used,
          daily_limit: quota.limit
        }
      });
    } catch (err) {
      console.error("AI error:", err);
      res.status(502).json({ error: "Service IA indisponible." });
    }
  }
);

app.post(
  "/api/ai/generate-letter",
  requireAuth,
  requireVerified,
  requirePremium,
  async (req, res) => {
    const input = parse(aiLetterSchema, req.body, res);
    if (!input) return;

    const quota = consumeAiQuota(req.user.id);
    if (!quota.ok) {
      return res.status(429).json({
        error: `Limite IA atteinte (${quota.limit}/jour).`
      });
    }

    try {
      const text = await generateCoverLetter(input);
      res.json({
        text,
        mode: process.env.AI_MODE || "mock",
        usage: {
          used_today: quota.used,
          daily_limit: quota.limit
        }
      });
    } catch (err) {
      console.error("AI letter error:", err);
      res.status(502).json({ error: "Service IA indisponible." });
    }
  }
);

/* ---------- ACCOUNT ---------- */

app.post("/api/account/change-password", requireAuth, async (req, res) => {
  const input = parse(passwordChangeSchema, req.body, res);
  if (!input) return;

  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!(await bcrypt.compare(input.currentPassword, user.password_hash))) {
    return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  }

  const newHash = await bcrypt.hash(input.newPassword, 12);
  db.prepare(`
    UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?
  `).run(newHash, user.id);

  const fresh = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  res.json({
    message: "Mot de passe modifié.",
    token: signUser(fresh)
  });
});

app.post("/api/account/logout-all", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET token_version=token_version+1 WHERE id=?").run(req.user.id);
  res.json({ message: "Toutes les sessions ont été invalidées." });
});

app.get("/api/account/export", requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id,email,plan,email_verified,subscription_status,created_at
    FROM users WHERE id=?
  `).get(req.user.id);

  const profiles = db.prepare("SELECT * FROM profiles WHERE user_id=?").all(req.user.id);
  const applications = db.prepare("SELECT * FROM applications WHERE user_id=?").all(req.user.id);
  const cvs = db.prepare("SELECT * FROM cv_documents WHERE user_id=?").all(req.user.id);
  const letters = db.prepare("SELECT * FROM cover_letters WHERE user_id=?").all(req.user.id);
  const aiUsage = db.prepare("SELECT * FROM ai_usage WHERE user_id=? ORDER BY usage_date DESC").all(req.user.id);

  res.json({ exported_at: new Date().toISOString(), user, profiles, cvs, letters, applications, ai_usage: aiUsage });
});

app.delete("/api/account", requireAuth, async (req, res) => {
  const input = parse(resetRequestSchema, { email: req.user.email }, res);
  if (!input) return;

  const password = String(req.body?.password || "");
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);

  if (!(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  if (user.stripe_subscription_id) {
    return res.status(409).json({
      error: "Gérez ou annulez d'abord l'abonnement Premium avant de supprimer le compte."
    });
  }

  db.prepare("DELETE FROM users WHERE id=?").run(req.user.id);
  res.json({ message: "Compte supprimé." });
});

/* ---------- FRONTEND ---------- */

app.get("/404", (req, res) => {
  res.status(404).sendFile(path.resolve("public/404.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

const httpServer = app.listen(PORT, () => {
  console.log(`CV France v20 running on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  httpServer.close(() => {
    try { db.close(); } catch {}
    console.log("HTTP server and database closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
