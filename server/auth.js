import jwt from "jsonwebtoken";
import db from "./db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.prepare(`
      SELECT id,email,plan,token_version,email_verified,
             stripe_customer_id,stripe_subscription_id,subscription_status
      FROM users WHERE id=?
    `).get(payload.id);

    if (!user || Number(payload.tv) !== Number(user.token_version)) {
      return res.status(401).json({ error: "Session expirée." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireVerified(req, res, next) {
  const stagingConsole =
    (process.env.APP_STAGE || "") === "staging" &&
    (process.env.EMAIL_MODE || "console") === "console";

  if (stagingConsole) return next();
  if (!req.user?.email_verified) {
    return res.status(403).json({ error: "Veuillez confirmer votre adresse e-mail." });
  }
  next();
}

export function requirePremium(req, res, next) {
  if (req.user?.plan !== "premium") {
    return res.status(403).json({ error: "Fonction réservée à Premium." });
  }
  next();
}

export function requireAdmin(req, res, next) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) {
    return res.status(503).json({ error: "ADMIN_EMAIL n'est pas configuré." });
  }

  if (!req.user?.email || req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: "Accès administrateur refusé." });
  }

  const stagingConsole =
    (process.env.APP_STAGE || "") === "staging" &&
    (process.env.EMAIL_MODE || "console") === "console";

  if (!stagingConsole && !req.user.email_verified) {
    return res.status(403).json({ error: "Le compte administrateur doit être vérifié." });
  }

  next();
}
