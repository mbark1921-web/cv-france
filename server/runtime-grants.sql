-- Optional explicit grant step, NOT run by migrations. An operator creates a
-- non-owner, non-superuser role named jovelya_app first. No credentials here.
GRANT USAGE ON SCHEMA public TO jovelya_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
 public.users, public.profiles, public.cv_documents, public.cover_letters,
 public.applications, public.password_reset_tokens, public.email_verification_tokens,
 public.ai_usage, public.feedback, public.audit_log, public.client_errors,
 public.beta_invites, public.beta_invite_uses TO jovelya_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jovelya_app;
-- No DDL, role administration, migration-ledger writes, superuser or BYPASSRLS.
