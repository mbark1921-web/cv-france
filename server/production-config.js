import cors from 'cors';

export function httpsUrl(value, originOnly = false) {
  try {
    if (typeof value !== 'string' || /[\s\\]/.test(value)) return false;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.search && !url.hash && url.hostname !== 'example.com' && !url.hostname.endsWith('.example.com') &&
      (!originOnly || value === url.origin);
  } catch { return false; }
}
export function configuredOrigins(env) {
  return String(env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
}
export function securityChecks(env) {
  const secret = String(env.JWT_SECRET || '');
  let databaseUrl = false;
  try { const url = new URL(env.DATABASE_URL); databaseUrl = ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname && url.pathname.length > 1); } catch {}
  const origins = configuredOrigins(env);
  return {
    jwt_secret: secret.length >= 32 && secret === secret.trim() && new Set(secret).size >= 8 &&
      !/development-secret|changeme|replace.?me|your[-_ ]?(jwt|secret)/i.test(secret),
    database_url: databaseUrl,
    https_base_url: httpsUrl(env.PUBLIC_BASE_URL),
    allowed_origins: origins.length > 0 && origins.every(origin => httpsUrl(origin, true))
  };
}
export function assertProductionConfig(env) {
  if (env.NODE_ENV !== 'production') return;
  const failed = Object.entries(securityChecks(env)).filter(([, valid]) => !valid).map(([name]) => name);
  if (failed.length) throw new Error('Invalid production security configuration: ' + failed.join(', '));
}

export function createCorsMiddleware(env) {
  const production = env.NODE_ENV === 'production';
  const origins = configuredOrigins(env);
  const configured = origins.length > 0 && origins.every(origin => httpsUrl(origin, true));
  const sameOrigin = httpsUrl(env.PUBLIC_BASE_URL) ? new URL(env.PUBLIC_BASE_URL).origin : null;
  const respond = cors({ origin: true });
  return (req, res, next) => {
    const origin = req.headers.origin;
    const allowed = !origin || (production
      ? configured && (origins.includes(origin) || origin === sameOrigin)
      : origins.length === 0 || origins.includes(origin));
    if (!allowed) return res.status(403).json({ error: 'Origin not allowed.' });
    return respond(req, res, next);
  };
}

// Imported immediately after dotenv and before the database/application modules.
// Diagnostics contain check names only, never supplied configuration values.
assertProductionConfig(process.env);
