import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });
  return transporter;
}

async function sendWithBrevo({ to, subject, text, html }) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || "").trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || "CV France").trim();

  if (!apiKey) throw new Error("BREVO_API_KEY is missing.");
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL is missing.");

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: to }],
    subject
  };

  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  if (!html && !text) payload.textContent = "";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const detail = data?.message || data?.code || raw || "Unknown Brevo API error";
    throw new Error(`Brevo API ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  return {
    ok: true,
    mode: "brevo",
    messageId: data?.messageId || null
  };
}

export async function sendMail({ to, subject, text, html }) {
  const mode = String(process.env.EMAIL_MODE || "console").toLowerCase();

  if (mode === "console") {
    console.log("EMAIL", { to, subject, text });
    return { ok: true, mode };
  }

  if (mode === "brevo") {
    return sendWithBrevo({ to, subject, text, html });
  }

  if (mode === "smtp") {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
    return { ok: true, mode, messageId: info.messageId };
  }

  throw new Error("Unsupported EMAIL_MODE.");
}
