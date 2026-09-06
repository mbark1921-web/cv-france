import { securityChecks } from './production-config.js';

const present = value => typeof value === 'string' && value.trim().length > 0;
const email = value => present(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes('example.com');
export function readinessConfiguration(env) {
  const production = env.NODE_ENV === 'production';
  const mode = String(env.EMAIL_MODE || 'console').toLowerCase();
  const emailReady = mode === 'brevo'
    ? present(env.BREVO_API_KEY) && email(env.BREVO_SENDER_EMAIL || env.EMAIL_FROM)
    : mode === 'smtp'
      ? present(env.SMTP_HOST) && present(env.SMTP_USER) && present(env.SMTP_PASSWORD) && email(env.EMAIL_FROM) &&
        Number.isInteger(Number(env.SMTP_PORT || 587)) && Number(env.SMTP_PORT || 587) > 0 && Number(env.SMTP_PORT || 587) <= 65535
      : !production && mode === 'console';
  const billing = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PREMIUM_PRICE_ID'];
  const aiMode = String(env.AI_MODE || 'mock');
  return {
    ...(production ? securityChecks(env) : {}),
    domain: !production || (present(env.DOMAIN) && !env.DOMAIN.includes('example.com')),
    support_email: !production || email(env.SUPPORT_EMAIL),
    admin_email: !production || email(env.ADMIN_EMAIL),
    email: emailReady,
    stripe: !billing.some(key => present(env[key])) || billing.every(key => present(env[key])),
    ai: aiMode === 'disabled' || (aiMode === 'openai' && present(env.OPENAI_API_KEY)) || (!production && aiMode === 'mock'),
    maintenance: env.MAINTENANCE_MODE !== 'on'
  };
}

export function createReadinessProbe({ env = process.env, ping, timeoutMs = 2000 }) {
  let pending;
  async function database() {
    // Coalesce concurrent probes; a stuck dependency cannot accumulate more queries.
    if (!pending) {
      const flight = Promise.resolve().then(ping).then(value => value === true, () => false);
      pending = flight;
      flight.finally(() => { if (pending === flight) pending = undefined; });
    }
    let timer;
    try { return await Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })]); }
    finally { clearTimeout(timer); }
  }
  return async () => {
    const checks = { ...readinessConfiguration(env), database: await database() };
    return { ok: Object.values(checks).every(value => value === true), checks };
  };
}

export function createStartupProbe(readiness) {
  let admitted = false;
  return async () => {
    if (!admitted && (await readiness()).ok) admitted = true;
    return { ok: admitted };
  };
}
