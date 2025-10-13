-- Adds JSONB columns to store full ward/city objects from ChautariLocationPicker
-- Safe to run multiple times.

-- ensure table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- add columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='roots_json'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN roots_json jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='diaspora_json'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN diaspora_json jsonb;
  END IF;

  -- keep legacy text columns if your app already uses them (optional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='roots'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN roots text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='diaspora'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN diaspora text;
  END IF;

  -- helpful updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END$$;

-- index for querying by ward/city ids inside JSON
CREATE INDEX IF NOT EXISTS idx_profiles_roots_json_gin ON public.profiles USING gin (roots_json);
CREATE INDEX IF NOT EXISTS idx_profiles_diaspora_json_gin ON public.profiles USING gin (diaspora_json);

-- RLS so members can upsert their own profile (if not already configured)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_self_upsert'
  ) THEN
    CREATE POLICY profiles_self_upsert
      ON public.profiles
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
