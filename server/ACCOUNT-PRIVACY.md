# Account controls and export scope

The account UI reuses `/api/account/change-password`, `/api/account/logout-all`,
`GET /api/account/export`, and `DELETE /api/account`. Password change keeps the
API's replacement token and existing invalidation rules. Session transitions use
the existing session-cleanup path. Passwords are never persisted in browser storage.

Deletion requires the current password, the localized typed confirmation
(`SUPPRIMER` / `حذف`), and explicit confirmation-button activation. Escape/cancel
clears these fields. Requests are serialized; no destructive request is retried
automatically. Lost mutation responses are checked against `/api/me`; if the old
session is no longer valid, local data is cleared without claiming deletion succeeded.

## Export includes

- Account identity, plan, verification/subscription state, provider customer and
  subscription identifiers, and account creation date.
- All saved profiles, CVs (including saved photos in `data_json`), letters,
  applications, and AI usage counters.
- Feedback linked to this user: rating, category, submitted text/page, status,
  and timestamps. Internal staff notes are excluded.
- Client-error diagnostics linked to this user: message, source, line/column,
  stack, page, user agent, and timestamp.
- This user's invitation-use history (not invitation access codes).

The JSON response has `Cache-Control: no-store` and an explicit `excluded` list.
Every query uses the authenticated user ID, never an ID supplied by the caller.
Profile/CV `data_json` remains in its existing serialized format without losing fields.

## Explicit exclusions and deletion limits

Excluded: password hashes and authentication tokens; internal security/audit logs;
staff notes; administrative invitation records and codes; unsaved browser forms and temporary
ATS/Interview results; unlinked feedback/diagnostics; provider records, server logs,
and backups. These exclusions are also disclosed in French/Arabic before download.

Existing C5 retention/cascades are unchanged. Account deletion removes the user
and cascading profile/document/application/token/usage/invitation-use rows.
Feedback, client diagnostics, audit records, and created invitation records remain
with the user reference set to NULL. Their text is **not anonymized** and can still
contain personal information. The deletion dialog discloses this and directs users
to support for retained records. This control does not delete provider records or
backups, or claim complete erasure. Retention/access handling for those records
remains an operator responsibility; no production changes are made here.
