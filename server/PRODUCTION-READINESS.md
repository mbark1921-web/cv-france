# Production configuration and probes

`NODE_ENV=production` validates security configuration during module initialization,
prior to database initialization and before the HTTP listener opens. Invalid values
throw an error containing failed check names only. Required:

- JWT_SECRET: at least 32 characters, no surrounding whitespace, at least eight
  distinct characters, and no recognized development/placeholder secret. Generate
  a cryptographically random secret (at least 32 random bytes); character checks
  cannot prove entropy. Existing signing, token lifetime and revocation rules stay unchanged.
- DATABASE_URL: a PostgreSQL URL with host and database name. Existing verified TLS
  validation still applies independently and is unchanged.
- PUBLIC_BASE_URL: an absolute HTTPS URL without credentials, query or fragment.
- ALLOWED_ORIGIN: a nonempty comma-separated list of exact HTTPS origins (scheme,
  host and optional port), without paths, wildcards or credentials.

Production CORS allows the configured list and the explicitly configured public
base origin, provided the list itself is valid. Requests without Origin remain
supported. Other origins receive JSON 403 with no CORS permission headers. Request
Host and forwarded headers never supply an allowed origin. Development/test retain
existing optional settings and allow-all CORS when the list is empty.

## Probe contract and Render

- `/api/health`: lightweight process liveness, HTTP 200 with `ok` and release version.
- `/api/readiness`: live PostgreSQL SELECT 1 plus configuration checks; HTTP 503
  when any required check fails. Returns only `ok` and boolean `checks`, no values.
  Database checks time out after two seconds and coalesce concurrent queries.
- `/api/startup`: Render's probe. Requires full readiness until its first success
  in this process, then returns lightweight liveness. A new process starts unadmitted.

Render uses one healthCheckPath for deploy admission AND automatic restarts. Using
live dependency readiness directly would turn a prolonged database outage into
restarts. The startup latch gates new deployments while avoiding that restart loop.
An external monitor should check `/api/readiness` for ongoing dependency outages;
Render's startup probe will not remove an already-admitted instance from traffic
solely because a dependency fails. The latch does not bypass initial readiness.
See https://render.com/docs/health-checks. No dashboard or production service was accessed.

Production readiness also requires domain, support/admin addresses and Brevo or
SMTP email configuration. Console email is not production-ready. SMTP checks host,
credentials, sender and port. Brevo checks key and sender. These checks verify
configuration, not provider acceptance/delivery: probes do not send emails or call
external providers. Operators must verify delivery separately. AI may be explicitly
disabled; OpenAI mode requires its key. Billing may be absent; partial billing
configuration is not ready. Maintenance mode is not ready. Existing optional
features are not enabled by these checks. PostgreSQL readiness does not depend on
SQLite/data-directory writability. Development/test only require the dependencies
selected in those environments, not production-only security/contact settings.

The legacy email build patch recognizes the shared readiness implementation;
PostgreSQL generation no longer relies on matching text to inject its database
probe. The release gate requires production-readiness regressions alongside all
existing suites. Tests use synthetic configuration and the gate-created isolated
loopback PostgreSQL database; no production URL or provider is contacted.
