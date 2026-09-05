# PostgreSQL provisioning and recovery (C5)

## Scope and safety

These commands are **isolated recovery tools**, not production administration tools.
They never load `.env` and never use `DATABASE_URL`. They refuse production flags,
remote hosts, port 5432, unconfirmed targets and databases without a disposable marker.
There is intentionally no production override. No command creates/drops a database,
cleans an existing schema, or restores over existing application tables.

The automated drill creates its own temporary PostgreSQL cluster, random port and
four disposable databases. It does not accept an external database URL. It inserts
synthetic records, uses real `pg_dump`/`pg_restore`, compares the restored data,
constraints and indexes, checks identity sequences, tests privileges, starts the
actual generated backend against the restored database and runs the existing smoke
test. It stops the cluster and removes its temporary data and dumps afterward.

Install native PostgreSQL tools of a compatible major version (tested with 18),
including `initdb`, `postgres`, `pg_ctl`, `pg_dump`, and `pg_restore`. Set `PG_BIN` to
their directory, or put them on PATH. No npm dependency is added.

```
npm run test:recovery
```

## Explicit local operator commands

For a separately created disposable cluster bound only to `127.0.0.1`, use a
non-default port and database names matching `jovelya_recovery_` followed by 8–40
lowercase letters/digits/underscores. The cluster administrator must mark each
fresh database explicitly, for example:

```sql
COMMENT ON DATABASE jovelya_recovery_example_source IS 'jovelya-disposable-recovery-v1';
COMMENT ON DATABASE jovelya_recovery_example_target IS 'jovelya-disposable-recovery-v1';
```

Supply these environment variables securely (do not put credentials in Git):

- `RECOVERY_DATABASE_URL`: explicit PostgreSQL URL for the disposable database;
  e.g. loopback and `sslmode=disable` for the isolated local cluster only.
- `RECOVERY_ISOLATED=YES` and `RECOVERY_CONFIRM`: the exact database name.
- Neither `NODE_ENV` nor `APP_STAGE` may be `production`.
- `PG_BIN`: native PostgreSQL tool directory if not on PATH.

Then run:

```
npm run db:provision
npm run backup -- /absolute/path/outside/repository/synthetic.dump
```

For restore, change the recovery URL and confirmation to the **separate, empty,
marked target**, then run:

```
npm run restore -- /absolute/path/outside/repository/synthetic.dump
```

On Windows use a Windows absolute path. Parent directories must already exist.
Archives and checksum manifests must stay outside the repository. Backups refuse
to overwrite files. Restore requires its matching SHA-256 manifest, a different
source database name, and an empty destination. Use only trusted archives: a dump
can contain executable SQL; the checksum detects corruption, not malicious authors.

Backups use PostgreSQL custom format, a consistent snapshot and `public` schema
only. They contain schema, table data, identity sequences and migration history.
They exclude role ownership and grants; apply reviewed grants separately. Restore
uses `--single-transaction --exit-on-error`, never `--clean` or `--create`.
The archive table-of-contents skips only creation of the already-existing empty
`public` schema; it does not drop/recreate that schema.
Failed commands exit nonzero and do not print credentials or raw tool output.
Passwords are passed through the child environment, not command arguments.
The generated web backup endpoint stays disabled: database recovery is not exposed
as an HTTP operation. The CLI replaces the former SQLite file-copy recovery path.

## Schema evidence and compatibility decisions

`migrations/001_application.sql` provisions 13 tables used by `index.js`, `auth.js`,
`auth-tokens.js` and the Jobs patch scripts. The runner adds `schema_migrations`,
records normalized SQL checksums, serializes migrations with a transaction advisory
lock, and rolls back both DDL and the ledger on failure. Repeated runs are no-ops;
changed or unknown applied migrations are rejected. An existing untracked schema
is refused, not silently adopted. Never edit a migration after adoption; append a
new reviewed migration instead.

- Integer identities preserve the application's numeric-ID assumptions. Email,
  invite code and token hashes are unique. Profile user ID and `(user_id, usage_date)`
  are keys because the application uses those `ON CONFLICT` targets.
- Token expiry/consumption and creation/update timestamps use `timestamptz`.
  JSON payload columns remain **text**, because the application calls `JSON.parse`.
  Application `applied_date` remains text with an empty-string default, matching C1.
- User-owned profiles, CVs, letters, applications, tokens, usage and invitation-use
  rows cascade on account deletion: the account route deletes only the user row.
- Feedback, audit, client errors and invitation creator references are nullable and
  use `SET NULL`, matching the admin `LEFT JOIN` reads. These historical retention
  choices need comparison with the production policy before adoption.
- Invitation deletion has no application route; referenced invitations are protected
  by the default FK restriction rather than an invented cascade.
- Indexes support per-user listing/order, token replacement, Stripe subscription
  lookup and foreign-key maintenance. Primary keys cover admin newest-ID lists.
  No unproven unique-primary-CV constraint or destructive data conversion was added.

`runtime-grants.sql` is a separately reviewed template for a `jovelya_app` role.
The role must already exist; the script creates no users/passwords. It grants schema
usage, application-table CRUD and sequence usage/read, but not schema creation,
migration history writes, role administration, superuser or BYPASSRLS. The test
verifies normal access and denied DDL/ledger changes. Keep migrations/restore under
a separate operator role. Review existing PUBLIC/default grants too: a grant-only
template cannot remove privileges a deployed role already holds.

## Deployment checks — NOT performed by this change

- Compare a separately authorized production schema export with this baseline:
  columns/defaults/types, identities, constraints, indexes, cascade/retention choices,
  extensions, triggers and migration history. This is not a drop-in migration for
  an unknown existing Supabase database. Do not run the baseline blindly.
- Confirm the live runtime role is not an owner/superuser/BYPASSRLS role and has only
  reviewed privileges. Confirm backup/restore role permissions separately.
- Verify Supabase exposed schemas, PUBLIC/anon/authenticated/service-role grants,
  default privileges, RLS policies and API exposure. This application uses its own
  JWT/users table, not Supabase Auth; do not assume `auth.uid()` maps to its users.
  The baseline does not invent RLS policies. Keep its tables inaccessible through
  the Supabase Data API until a reviewed access-control design is established.
- Verify C4 production CA/hostname trust and the correct direct or session-pooler
  endpoint. Do not disable TLS verification for native recovery tools.
- Provider backups/PITR must cover the real database, roles/extensions, other schemas,
  Supabase Auth/Storage dependencies and external assets. This public-schema drill
  is not a whole-Supabase-project backup. Set RPO/RTO, retention, encryption, off-site
  storage and ownership; time and record a separately authorized staging restore.
- Before any production recovery, obtain explicit authorization and a maintenance/
  rollback plan. Restore to a separate environment first and validate before a
  controlled cutover. These local-only tools deliberately cannot target production.

No production connections or changes are part of C5.
