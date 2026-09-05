import fs from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { checkServerIdentity } from 'node:tls';

export function databaseConnectionOptions(env = process.env) {
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('A valid PostgreSQL DATABASE_URL is required.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new Error('A PostgreSQL TCP connection URL is required.');
  }
  const host = (url.searchParams.get('host') || decodeURIComponent(url.hostname)).replace(/^\[|\]$/g, '');
  const production = env.NODE_ENV?.toLowerCase() === 'production' || env.APP_STAGE?.toLowerCase() === 'production';
  const local = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());
  for (const key of ['sslmode', 'ssl', 'sslrootcert', 'host']) {
    if (url.searchParams.getAll(key).length > 1) throw new Error('Duplicate database TLS options are not allowed.');
  }
  const mode = url.searchParams.get('sslmode');
  const sslFlag = url.searchParams.get('ssl');
  if (mode && !['disable', 'require', 'prefer', 'verify-ca', 'verify-full'].includes(mode)) {
    throw new Error('Unsupported database TLS mode; use verify-full.');
  }
  if (sslFlag && !['true', '1', 'false', '0'].includes(sslFlag)) throw new Error('Unsupported database TLS option.');
  const plaintext = mode === 'disable' || ['false', '0'].includes(sslFlag);
  if (plaintext && (production || !local)) throw new Error('Unencrypted database connections are restricted to non-production loopback hosts.');
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('Global TLS verification must not be disabled.');
  const urlCa = url.searchParams.get('sslrootcert');
  if (urlCa && env.DATABASE_CA_CERT_PATH) throw new Error('Configure only one database CA certificate path.');
  const caPath = env.DATABASE_CA_CERT_PATH || urlCa;
  if (plaintext && caPath) throw new Error('A database CA cannot be combined with disabled TLS.');
  // pg reparses connectionString and can overwrite ssl. Remove its TLS controls
  // after interpreting them here; require/prefer/verify-ca are upgraded to full verification.
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('ssl') && !['sslmode', 'ssl', 'sslrootcert'].includes(key)) {
      throw new Error('Unsupported database TLS URL option.');
    }
    if (key.startsWith('ssl') || key === 'uselibpqcompat') url.searchParams.delete(key);
  }
  if (plaintext) return { connectionString: url.toString(), ssl: false };
  const ssl = { rejectUnauthorized: true, checkServerIdentity: (_name, cert) => checkServerIdentity(host, cert) };
  if (caPath) {
    try {
      if (!path.isAbsolute(caPath)) throw new Error();
      const ca = fs.readFileSync(caPath, 'utf8');
      const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
      if (!certificates?.length || /PRIVATE KEY/.test(ca)) throw new Error();
      for (const certificate of certificates) new X509Certificate(certificate);
      ssl.ca = ca;
    } catch { throw new Error('Database CA certificate file is missing or invalid.'); }
  }
  return { connectionString: url.toString(), ssl };
}
