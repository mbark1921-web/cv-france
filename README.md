# CV France v20.2.1

Application de création de CV, lettres de motivation et suivi de candidatures.

## Production Render
Le dépôt contient `render.yaml` pour déployer le service Docker en production. L'hébergement reste configuré sur le plan gratuit (`plan: free`).

Configuration actuelle: `APP_STAGE=production`, `EMAIL_MODE=console`, `AI_MODE=mock`. Stripe reste optionnel tant que les variables correspondantes ne sont pas configurées.

## Sécurité
Ne jamais committer `.env`, clés API, secrets Stripe, mots de passe SMTP ou bases SQLite. `.gitignore` protège ces fichiers.

## Commandes
- `npm start`
- `npm run doctor`
- `npm run platform-check`
- `npm run test:smoke`
- `npm run backup`

## PostgreSQL TLS verification (C4)

Database connections verify both the certificate chain and the hostname. The Render
configuration sets `NODE_ENV=production` and `APP_STAGE=production` and supplies
`DATABASE_URL` externally; the repository does not contain the live endpoint or CA.
No production connection has been certified by the local tests.

- Publicly trusted database endpoints use Node's default CA trust store.
- If the Supabase endpoint needs the project's CA, download the CA certificate from
  **Database Settings → SSL Configuration** in that project's dashboard. Mount it
  outside the repository (for example, a Render secret file) and set
  `DATABASE_CA_CERT_PATH` to its absolute path. Alternatively, use an absolute
  `sslrootcert` URL parameter; do not configure both. Do not copy a certificate
  from an unrelated project or trust a certificate obtained from a failing handshake.
- Keep the hostname supplied by the provider. Verification includes hostname
  matching for both direct and pooler endpoints. `sslmode=verify-full` is preferred;
  existing `require`, `prefer`, and `verify-ca` URLs are upgraded to full verification.
- Untrusted certificates, hostname mismatches, missing/invalid CA files and TLS
  downgrade attempts fail without retrying in plaintext. TLS URL options are
  normalized before `pg` parses the URL so they cannot overwrite verification.
- Local PostgreSQL without TLS requires an explicit `sslmode=disable`, a loopback
  host (`localhost`, `127.0.0.1`, or `::1`), and neither production environment flag.
  This supports the isolated C2 test database. Remote development still uses TLS.
- Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`, or commit private keys, credentials,
  production certificate files, or database data. No client private key is required.

Before deployment, verify the real endpoint with the chosen trust configuration by
running `node --input-type=module -e "const {default:db}=await import('./server/db.js'); try { await db.ping(); console.log('Verified database connection'); } finally { await db.close(); }"`
with the production environment supplied securely. Resolve any trust failure using
the provider's current CA; never disable verification. This patch does not change
Render settings or Supabase's server-side SSL enforcement.

Run `npm run test:tls` for configuration and actual TLS-handshake tests using the
installed `pg` client and a local PostgreSQL wire-protocol fixture. OpenSSL must be
available on PATH, or set `OPENSSL_BIN` to its executable. Test certificates and
private keys are generated in a temporary directory and deleted afterward; none
are checked in. This adds no npm dependencies.

References: [Supabase TLS guidance](https://supabase.com/docs/guides/platform/ssl-enforcement)
and [node-postgres SSL configuration](https://node-postgres.com/features/ssl).

## PostgreSQL provisioning and recovery (C5)

See [the isolated recovery runbook](server/RECOVERY.md) for versioned schema,
`npm run db:provision`, real PostgreSQL backup/restore, the restore drill, privileges,
and deployment checks. These tools intentionally refuse production targets and
never read the application's `DATABASE_URL` or `.env`.
