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
    jt�PЀL@