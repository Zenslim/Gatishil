# 📜 Auth & Profile Schema Contract (Updated 2025-10-24)

**Resolved**

- `public.profiles` primary key is now `id` (was `user_id`), with app-expected columns: `name`, `surname`, `email`, `phone`, `photo_url`, `occupation`, `skill[]`, `passion[]`, `compassion[]`, `vision`, `passkey_enabled`, `passkey_cred_ids`.
- `public.trusted_factors` table now exists with `(auth_user_id, factor_type)` PK and owner-only RLS.

**Migration file:** `supabase/sql/20251024_align_profiles_and_trusted_factors.sql`
