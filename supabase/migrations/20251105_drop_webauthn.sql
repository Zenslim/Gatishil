-- Remove legacy WebAuthn storage
drop table if exists public.webauthn_credentials cascade;
drop table if exists public.webauthn_challenges cascade;
