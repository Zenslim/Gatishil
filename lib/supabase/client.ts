// lib/supabase/client.ts
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase"; // optional if you have types

/**
 * Unified Supabase client for browser (Next.js App Router).
 * Ensures cookies are parsed consistently (no Base64 mismatch).
 * Use this for all client-side components like /admin, dashboard, etc.
 */
export const supabase = createClientComponentClient<Database>();
