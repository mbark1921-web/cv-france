import { createRawToken, hashToken, futureIso } from './tokens.js';

const purposes = {
  passwordReset: { table: 'password_reset_tokens', minutes: 30, prefix: 'reset-v2.' },
  emailVerification: { table: 'email_verification_tokens', minutes: 60, prefix: 'verify-v2.' }
};

function configFor(purpose) {
  if (!Object.hasOwn(purposes, purpose)) throw new Error('Unknown token purpose');
  return purposes[purpose];
}

export function issueAuthToken(purpose) {
  const { minutes, prefix } = configFor(purpose);
  // Versioning rejects all previously issued links with incorrect, years-long TTLs.
  const raw = prefix + createRawToken();
  return { raw, hash: hashToken(raw), expiresAt: futureIso(minutes) };
}

export async function consumeAuthToken(db, purpose, raw, changeAccount) {
  const { table, prefix } = configFor(purpose);
  if (typeof raw !== 'string' || !raw.startsWith(prefix)) return false;

  return db.transaction(async () => {
    // PostgreSQL locks the matching row and rechecks used_at after waiting for
    // another consumer. Only the winning transaction can change the account.
    // Use the database wall clock, not a timestamp captured before password hashing.
    const { rows } = await db.query(`
      UPDATE ${table}
      SET used_at=clock_timestamp()
      WHERE token_hash=? AND used_at IS NULL AND expires_at > clock_timestamp()
      RETURNING user_id
    `, [hashToken(raw)]);
    if (!rows.length) return false;
    await changeAccount(rows[0].user_id);
    return true;
  })();
}
